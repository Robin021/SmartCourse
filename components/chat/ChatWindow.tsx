"use client";

import { useEffect, useState } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { X } from "lucide-react";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
}

interface ChatWindowProps {
    projectId: string;
    stageId?: string;
    contextInput?: Record<string, any>;
    contextOutput?: string;
    selectedText?: string;
    onApplyContent?: (content: string) => void;
    onApplySelection?: (content: string) => void;
    onClose?: () => void;
}

export default function ChatWindow({
    projectId,
    stageId,
    contextInput,
    contextOutput,
    selectedText,
    onApplyContent,
    onApplySelection,
    onClose,
}: ChatWindowProps) {
    const initialMessage: Message = {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm your AI assistant. How can I help you with this project?",
    };
    const [messages, setMessages] = useState<Message[]>([initialMessage]);
    const [isLoading, setIsLoading] = useState(false);

    const scrollToBottom = () => {
        const el = document.getElementById("chat-scroll-anchor");
        if (el) {
            el.scrollIntoView({ behavior: "smooth" });
        }
    };

    useEffect(() => {
        const loadConversation = async () => {
            try {
                const url = stageId
                    ? `/api/project/${projectId}/chat?stage=${stageId}`
                    : `/api/project/${projectId}/chat`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.success && Array.isArray(data.messages) && data.messages.length > 0) {
                    setMessages(
                        data.messages.map((m: any, idx: number) => ({
                            id: `${m.timestamp || idx}-${idx}`,
                            role: m.role,
                            content: m.content,
                        }))
                    );
                }
            } catch (error) {
                console.warn("Load conversation failed", error);
            }
        };

        loadConversation();
    }, [projectId, stageId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (content: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content,
        };

        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const historyToSend = [...messages, userMessage];
            const res = await fetch("/api/chat?stream=1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    stageId,
                    message: content,
                    history: historyToSend,
                    contextInput,
                    contextOutput,
                    contextSelection: selectedText,
                }),
            });

            const assistantId = (Date.now() + 1).toString();
            setMessages((prev) => [
                ...prev,
                { id: assistantId, role: "assistant", content: "" },
            ]);

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to get response");
            }

            if (!res.body) {
                const data = await res.json();
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, content: data.response } : m
                    )
                );
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let acc = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                acc += decoder.decode(value, { stream: true });
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === assistantId ? { ...m, content: acc } : m
                    )
                );
            }
            acc += decoder.decode();
            setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
            );
        } catch (error) {
            console.error("Chat error:", error);
            setMessages((prev) => [
                ...prev,
                {
                    id: `error-${Date.now()}`,
                    role: "assistant",
                    content: "对话失败，请稍后重试。",
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = (content: string) => {
        if (selectedText && onApplySelection) {
            onApplySelection(content);
        } else {
            onApplyContent?.(content);
        }
    };

    return (
        <div className="flex h-[520px] max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">AI 助手</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {stageId && <span>当前阶段：{stageId}</span>}
                        {selectedText && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-200">
                                已选中 {selectedText.length} 字，将只修改这段
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={async () => {
                            setMessages([initialMessage]);
                            try {
                                await fetch(`/api/project/${projectId}/chat`, {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        stageId,
                                        messages: [],
                                    }),
                                });
                            } catch (error) {
                                console.warn("Clear conversation failed", error);
                            }
                        }}
                        className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        清空
                    </button>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            aria-label="关闭助手"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>
            <MessageList
                messages={messages}
                onApplyContent={handleApply}
                applyLabel={selectedText ? "替换选中内容" : "应用到正文"}
            />
            <div id="chat-scroll-anchor" />
            <MessageInput onSend={handleSend} isLoading={isLoading} />
        </div>
    );
}
