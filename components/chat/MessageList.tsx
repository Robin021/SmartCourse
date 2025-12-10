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
                    className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""
                        }`}
                >
                    <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${message.role === "user"
                                ? "bg-indigo-600 border-indigo-600 text-white"
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
                            className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${message.role === "user"
                                    ? "bg-indigo-600 text-white"
                                    : "bg-white border border-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
                                }`}
                        >
                            {message.content}
                        </div>
                        {message.role === "assistant" && onApplyContent && message.content.trim() && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onApplyContent(message.content)}
                                    className="text-[11px] rounded border border-zinc-200 px-2 py-1 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                    {applyLabel || "应用到正文"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
