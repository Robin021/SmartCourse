import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { LLMClient } from "@/lib/llm";
import Project from "@/models/Project";

const MAX_REFERENCE_CHARS = 1200;
const MAX_FIELD_VALUE_CHARS = 1200;

const clampText = (value: string, maxLen: number) =>
    value.length > maxLen ? value.slice(0, maxLen) : value;

const tryParseJson = (raw: string) => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const extractJsonPayload = (raw: string) => {
    const trimmed = (raw || "").trim();
    if (!trimmed) return null;

    const direct = tryParseJson(trimmed);
    if (direct) return direct;

    const fencedMatches = [...trimmed.matchAll(/```(?:json)?\n([\s\S]*?)```/gi)];
    if (fencedMatches.length > 0) {
        const lastBlock = fencedMatches[fencedMatches.length - 1][1];
        const parsed = tryParseJson(lastBlock.trim());
        if (parsed) return parsed;
    }

    const braceMatch = trimmed.match(/\{[\s\S]*\}/);
    if (braceMatch) {
        return tryParseJson(braceMatch[0]);
    }
    return null;
};

const buildReferenceText = (references: any[]) => {
    if (!Array.isArray(references) || references.length === 0) return "";
    return references
        .map((ref, idx) => {
            const title =
                ref?.metadata?.original_name ||
                ref?.metadata?.title ||
                ref?.title ||
                ref?.url ||
                `参考资料 ${idx + 1}`;
            const snippet = ref?.content || ref?.snippet || "";
            const body = clampText(String(snippet || "").trim(), MAX_REFERENCE_CHARS);
            const source = ref?.source ? `(${ref.source})` : "";
            return `[${idx + 1}] ${title} ${source}\n${body}`;
        })
        .join("\n\n---\n\n");
};

const sanitizeSuggestion = (value: any) => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) {
        const items = value
            .map((item) => (typeof item === "string" ? item.trim() : String(item)))
            .filter((item) => item.length > 0);
        return items.length > 0 ? items : null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed) return null;
        return clampText(trimmed, MAX_FIELD_VALUE_CHARS);
    }
    return clampText(String(value), MAX_FIELD_VALUE_CHARS);
};

const findFieldValue = (
    input: any,
    matcher: (key: string) => boolean
): string | undefined => {
    if (!input || typeof input !== "object") return undefined;

    for (const [key, value] of Object.entries(input)) {
        if (matcher(key) && typeof value === "string" && value.trim()) {
            return value.trim();
        }
        if (value && typeof value === "object") {
            const nested = findFieldValue(value, matcher);
            if (nested) return nested;
        }
    }
    return undefined;
};

export async function POST(
    req: Request,
    context: { params: Promise<{ id: string; stageId: string }> }
) {
    try {
        const { id: projectId, stageId } = await context.params;
        const { formData, schemaFields, references, mode } = await req.json();

        if (!projectId || !stageId) {
            return NextResponse.json(
                { success: false, error: "Project ID and stage ID are required" },
                { status: 400 }
            );
        }

        if (!Array.isArray(schemaFields) || schemaFields.length === 0) {
            return NextResponse.json(
                { success: false, error: "Schema fields are required" },
                { status: 400 }
            );
        }

        await connectDB();

        const project = await Project.findById(projectId).lean();
        if (!project) {
            return NextResponse.json(
                { success: false, error: "Project not found" },
                { status: 404 }
            );
        }

        const schoolName =
            findFieldValue(formData, (k) => /school.*name|学校名称|school_name/i.test(k)) ||
            findFieldValue(
                (project as any)?.stages?.Q1?.input,
                (k) => /school.*name|学校名称|school_name/i.test(k)
            ) ||
            "";

        if (!schoolName) {
            return NextResponse.json(
                { success: false, error: "请先填写学校名称（Q1）后再进行 AI 填写" },
                { status: 400 }
            );
        }

        const allowedKeys = new Set(
            schemaFields.map((field: any) => String(field.key))
        );
        const schemaLines = schemaFields.map((field: any) => {
            const options = Array.isArray(field.options)
                ? field.options
                      .map((opt: any) => `${opt.label}(${opt.value})`)
                      .join(", ")
                : "";
            const optionText = options ? ` Options: ${options}` : "";
            const requiredText = field.required ? " required" : "";
            return `- ${field.key}: ${field.label} (type: ${field.type}${requiredText})${optionText}`;
        });

        const webReferences = Array.isArray(references)
            ? references.filter(
                  (ref) => String(ref?.source || "").toLowerCase() === "web"
              )
            : [];
        const referenceText = buildReferenceText(webReferences);

        const allowOverwrite = mode === "overwrite";

        const systemPrompt = [
            "You are an expert educational consultant helping fill in a curriculum design form.",
            "Return JSON only. Do not include markdown or extra commentary.",
            allowOverwrite
                ? "You may suggest improvements to existing fields."
                : "Only suggest values for fields that are currently empty.",
            "For select/multiselect fields, use the option value (not the label).",
            "Use only the provided reference materials and form context.",
            "Respond in Simplified Chinese.",
            "If you are unsure, omit the field from suggestions.",
        ].join(" ");

        const userPrompt = [
            `Stage: ${stageId}`,
            `School name: ${schoolName}`,
            "Form fields:",
            schemaLines.join("\n"),
            "Current form values:",
            JSON.stringify(formData || {}, null, 2),
            referenceText ? "Reference materials:" : "Reference materials: (none)",
            referenceText || "",
            "Return JSON in this shape:",
            '{"suggestions": { "<field_key>": "<value_or_array>" }, "notes": "<short note>"}',
        ]
            .filter(Boolean)
            .join("\n\n");

        const llmResponse = await LLMClient.chat(
            [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
            ],
            { temperature: 0.2 }
        );

        const parsed = extractJsonPayload(llmResponse.content || "");
        if (!parsed || typeof parsed !== "object") {
            return NextResponse.json(
                { success: false, error: "AI response is not valid JSON" },
                { status: 500 }
            );
        }

        const rawSuggestions =
            (parsed as any).suggestions && typeof (parsed as any).suggestions === "object"
                ? (parsed as any).suggestions
                : parsed;

        const suggestions: Record<string, any> = {};
        const isEmptyValue = (value: any) => {
            if (value === null || value === undefined) return true;
            if (Array.isArray(value)) return value.length === 0;
            if (typeof value === "string") return value.trim().length === 0;
            return false;
        };

        for (const [key, value] of Object.entries(rawSuggestions || {})) {
            if (!allowedKeys.has(key)) continue;
            if (!allowOverwrite && !isEmptyValue((formData || {})[key])) continue;
            const sanitized = sanitizeSuggestion(value);
            if (sanitized === null) continue;
            suggestions[key] = sanitized;
        }

        return NextResponse.json({
            success: true,
            suggestions,
            notes: typeof (parsed as any).notes === "string" ? (parsed as any).notes : "",
        });
    } catch (error: any) {
        console.error("[AI Fill] Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "AI fill failed" },
            { status: 500 }
        );
    }
}
