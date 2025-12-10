"use client";

import { Send } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface MessageInputProps {
    onSend: (message: string) => void;
    isLoading: boolean;
}

export default function MessageInput({ onSend, isLoading }: MessageInputProps) {
    const [input, setInput] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSend(input.trim());
            setInput("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
        }
    }, [input]);

    return (
        <form
            onSubmit={handleSubmit}
            className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
        >
            <div className="relative flex items-end gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about this project..."
                    rows={1}
                    className="max-h-32 w-full resize-none bg-transparent px-2 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || isLoading}
                    className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white transition-all hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </form>
    );
}
