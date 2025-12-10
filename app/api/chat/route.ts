import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/Project";
import StageConfig from "@/models/StageConfig";
import { getPrompt } from "@/lib/getPrompt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

// Fallback prompt if database prompt not found
const FALLBACK_SYSTEM_PROMPT = `You are an expert educational consultant helping design a school plan. 
You have access to the current project data. Use it to answer the user's questions.

CONTEXT:
{{context}}`;

export async function POST(req: Request) {
    try {
        await connectDB();
        const {
            message,
            projectId,
            stageId,
            history,
            contextInput,
            contextOutput,
            contextSelection,
        } = await req.json();
        const { searchParams } = new URL(req.url);
        const shouldStream = searchParams.get("stream") === "1";

        if (!projectId) {
            return NextResponse.json(
                { error: "Project ID is required" },
                { status: 400 }
            );
        }

        // Get user ID from token for consistent A/B testing
        let userId: string | undefined;
        try {
            const cookieStore = await cookies();
            const token = cookieStore.get("token")?.value;
            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
                userId = decoded.userId;
            }
        } catch {
            // Token verification failed, continue without userId
        }

        // 1. Fetch Project Context
        const project = await Project.findById(projectId).lean();
        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        // 2. Fetch Stage Config for definitions
        const config = await StageConfig.findOne({
            version: project.config_version,
        }).lean();

        // 3. Construct Context String (inputs + AI outputs)
        const formatBlock = (title: string, value?: any, maxLen = 2800) => {
            if (!value) return "";
            const str = typeof value === "string" ? value : JSON.stringify(value, null, 2);
            const clipped = str.length > maxLen ? `${str.slice(0, maxLen)}...` : str;
            return `${title}:\n${clipped}\n`;
        };

        const configStages = config?.stages || [];
        const currentStageData = stageId ? (project.stages?.[stageId] as any) : null;
        const currentStageName =
            configStages.find((s: any) => s.stage_id === stageId)?.name || stageId;

        let context = `Project Name: ${project.name}\nCurrent Stage: ${stageId || project.current_stage}\n`;
        if (currentStageName) {
            context += `Stage Title: ${currentStageName}\n`;
        }

        if (currentStageData) {
            context += formatBlock("Current Stage Input (form)", currentStageData.input || contextInput);
            context += formatBlock(
                "Current Stage Output / Draft",
                contextOutput ||
                    currentStageData.output?.content ||
                    currentStageData.output?.report ||
                    currentStageData.output
            );
        } else {
            context += formatBlock("Current Stage Input (form)", contextInput);
            context += formatBlock("Current Stage Output / Draft", contextOutput);
        }
        if (contextSelection) {
            context += formatBlock("Selected Snippet To Revise", contextSelection, 1600);
        }

        // Previous completed stages context
        const previousContext: string[] = [];
        const stageOrder = configStages.length
            ? configStages.map((s: any) => s.stage_id)
            : Object.keys(project.stages || {});
        if (stageId) {
            for (const sid of stageOrder) {
                if (sid === stageId) break;
                const s = (project.stages as any)?.[sid];
                if (s?.status === "completed" && s.output) {
                    const name = configStages.find((c: any) => c.stage_id === sid)?.name || sid;
                    const text =
                        typeof s.output === "string"
                            ? s.output
                            : s.output.content || s.output.report || JSON.stringify(s.output);
                    previousContext.push(`${sid} ${name} Output:\n${text}`);
                }
            }
        }
        if (previousContext.length) {
            context += `\nPrevious Stages (completed):\n${previousContext.join(
                "\n\n---\n\n"
            )}\n`;
        }

        // 4. Get dynamic system prompt with A/B testing support
        const promptResult = await getPrompt({
            key: "chat_system",
            variables: { context },
            userId, // For consistent A/B test experience per user
        });

        const systemPrompt = promptResult?.interpolated ||
            FALLBACK_SYSTEM_PROMPT.replace("{{context}}", context);

        // Log A/B test info for analytics
        if (promptResult?.isABTest) {
            console.log(`[A/B Test] User ${userId || "anonymous"} got prompt version ${promptResult.version}`);
        }

        // 5. Filter and format history (last 10 messages to save tokens)
        const recentHistory = (history || [])
            .slice(-10)
            .map((msg: any) => ({
                role: msg.role === "user" ? "user" : "assistant",
                content: msg.content,
            }));

        const messages = [
            {
                role: "system",
                content:
                    systemPrompt +
                    "\n\nUse the provided stage input, current draft/output, and previous stage outputs. When user asks to modify, rewrite only the relevant parts of the current draft, keep untouched sections verbatim, and return the updated draft (not advice text). Keep alignment with existing data." +
                    (contextSelection
                        ? "\n\nA specific snippet is selected. Rewrite ONLY that snippet and return the rewritten snippet text (no other sections). Do not restate unchanged content."
                        : "\n\nIf no snippet is provided, keep changes minimal and avoid rephrasing untouched sections."),
            },
            ...recentHistory,
            { role: "user", content: message },
        ];

        // 6. Call DeepSeek API
        if (!DEEPSEEK_API_KEY) {
            throw new Error("DEEPSEEK_API_KEY is not defined");
        }

        // Streaming path
        if (shouldStream) {
            const upstream = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages,
                    temperature: 0.7,
                    stream: true,
                }),
            });

            if (!upstream.ok || !upstream.body) {
                const data = await upstream.json().catch(() => ({}));
                console.error("DeepSeek Stream Error:", data);
                throw new Error(data.error?.message || "Failed to call LLM");
            }

            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let fullContent = "";

            const stream = new ReadableStream({
                async start(controller) {
                    const reader = upstream.body!.getReader();
                    let buffer = "";
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split("\n");
                            buffer = lines.pop() || "";
                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || trimmed === "data: [DONE]") continue;
                                if (!trimmed.startsWith("data:")) continue;
                                try {
                                    const json = JSON.parse(trimmed.replace(/^data:\s*/, ""));
                                    const delta = json.choices?.[0]?.delta?.content || "";
                                    if (delta) {
                                        fullContent += delta;
                                        controller.enqueue(encoder.encode(delta));
                                    }
                                } catch {
                                    // Ignore malformed chunks
                                }
                            }
                        }
                    } catch (err) {
                        controller.error(err);
                        return;
                    }

                    // Persist after stream completes
                    try {
                        const projectToUpdate = await Project.findById(projectId);
                        if (projectToUpdate) {
                            const combined = [
                                ...recentHistory,
                                { role: "user", content: message, timestamp: new Date() },
                                { role: "assistant", content: fullContent, timestamp: new Date() },
                            ];
                            const trimmed = combined.slice(-10);
                            const sessions = projectToUpdate.conversation_sessions || {};
                            const key = stageId ? `stage:${stageId}` : "default";
                            (sessions as any)[key] = { messages: trimmed, updated_at: new Date() };
                            projectToUpdate.conversation_sessions = sessions as any;
                            projectToUpdate.markModified("conversation_sessions");
                            await projectToUpdate.save();
                        }
                    } catch (persistError) {
                        console.warn("[Chat] Failed to persist conversation", persistError);
                    }

                    controller.close();
                },
            });

            return new Response(stream, {
                headers: {
                    "Content-Type": "text/plain; charset=utf-8",
                    "Cache-Control": "no-cache",
                    Connection: "keep-alive",
                },
            });
        }

        // Non-stream fallback
        const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                temperature: 0.7,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("DeepSeek API Error:", data);
            throw new Error(data.error?.message || "Failed to call LLM");
        }

        const aiResponse = data.choices[0].message.content;

        // Persist conversation (last 5 rounds / 10 messages)
        if (projectId) {
            try {
                const projectToUpdate = await Project.findById(projectId);
                if (projectToUpdate) {
                    const combined = [
                        ...recentHistory,
                        { role: "user", content: message, timestamp: new Date() },
                        { role: "assistant", content: aiResponse, timestamp: new Date() },
                    ];
                    const trimmed = combined.slice(-10);
                    const sessions = projectToUpdate.conversation_sessions || {};
                    const key = stageId ? `stage:${stageId}` : "default";
                    (sessions as any)[key] = { messages: trimmed, updated_at: new Date() };
                    projectToUpdate.conversation_sessions = sessions as any;
                    projectToUpdate.markModified("conversation_sessions");
                    await projectToUpdate.save();
                }
            } catch (persistError) {
                console.warn("[Chat] Failed to persist conversation", persistError);
            }
        }

        return NextResponse.json({
            success: true,
            response: aiResponse,
            promptVersion: promptResult?.version, // Include for analytics
        });
    } catch (error: any) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process message" },
            { status: 500 }
        );
    }
}
