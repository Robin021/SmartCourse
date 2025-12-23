import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface MessageListProps {
    messages: Message[];
    onApplyContent?: (content: string) => void;
    applyLabel?: string;
}

export default function MessageList({ messages, onApplyContent, applyLabel }: MessageListProps) {
    const listRef = useRef<HTMLDivElement>(null);

    const parseStructuredResponse = (content: string) => {
        const text = content?.trim();
        if (!text) return null;

        const tryJson = (payload?: string | null) => {
            if (!payload) return null;
            try {
                return JSON.parse(payload);
            } catch {
                return null;
            }
        };

        // Prefer fenced JSON; use a global regex as required by matchAll
        const fenced = [...text.matchAll(/```(?:json)?\n([\s\S]*?)```/gi)];
        const candidateJson = fenced.length > 0 ? fenced[fenced.length - 1][1] : text;
        const parsed = tryJson(candidateJson);

        if (
            parsed &&
            typeof parsed === "object" &&
            typeof (parsed as any).replacement === "string"
        ) {
            return {
                replacement: ((parsed as any).replacement as string).trim(),
                notes:
                    typeof (parsed as any).notes === "string"
                        ? ((parsed as any).notes as string).trim()
                        : "",
            };
        }

        return null;
    };

    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
                <div
                    key={message.id}
                    className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                    {(() => {
                        const structured =
                            message.role === "assistant"
                                ? parseStructuredResponse(message.content)
                                : null;
                        const displayText = structured?.replacement || message.content;
                        const notes = structured?.notes;
                        const applyPayload = structured?.replacement || message.content;

                        return (
                            <>
                                <div
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                                        message.role === "user"
                                            ? "bg-cyan-600 border-cyan-600 text-white"
                                            : "bg-white border-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                                    }`}
                                >
                                    {message.role === "user" ? (
                                        <User className="h-4 w-4" />
                                    ) : (
                                        <Bot className="h-4 w-4" />
                                    )}
                                </div>
                                <div className="flex max-w-[85%] flex-col gap-2">
                                    <div
                                        className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                                            message.role === "user"
                                                ? "bg-cyan-600 text-white"
                                                : "bg-white border border-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                                        }`}
                                    >
                                        {displayText}
                                        {notes && (
                                            <div className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                备注：{notes}
                                            </div>
                                        )}
                                        {structured && (
                                            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] text-zinc-600 dark:bg-zinc-700/40 dark:text-zinc-200">
                                                结构化输出 · 已提取 replacement
                                            </div>
                                        )}
                                    </div>
                                    {message.role === "assistant" &&
                                        onApplyContent &&
                                        applyPayload.trim() && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => onApplyContent(applyPayload)}
                                                    className="text-[11px] rounded border border-zinc-200 px-2 py-1 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                                >
                                                    {applyLabel || "应用到正文"}
                                                </button>
                                            </div>
                                        )}
                                </div>
                            </>
                        );
                    })()}
                </div>
            ))}
        </div>
    );
}
