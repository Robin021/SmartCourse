"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface EditorProps {
    content: string;
    onChange?: (value: string) => void;
    onApply?: (value: string) => void;
    onAiAssist?: () => void;
    onSelectionChange?: (selection: { text: string; start: number; end: number } | null) => void;
}

export function TiptapEditor({
    content,
    onChange,
    onApply,
    onAiAssist,
    onSelectionChange,
}: EditorProps) {
    const [mode, setMode] = useState<"edit" | "preview">("preview");

    const handleSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        const start = target.selectionStart ?? 0;
        const end = target.selectionEnd ?? 0;
        const text = content.slice(start, end);
        if (start === end || !text) {
            onSelectionChange?.(null);
        } else {
            onSelectionChange?.({ text, start, end });
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="border-b p-2 flex gap-2 bg-muted/20 items-center">
                <div className="flex gap-1 text-xs">
                    <button
                        onClick={() => setMode("preview")}
                        className={`px-2 py-1 rounded ${mode === "preview" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                    >
                        预览
                    </button>
                    <button
                        onClick={() => setMode("edit")}
                        className={`px-2 py-1 rounded ${mode === "edit" ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                    >
                        编辑
                    </button>
                </div>
                <div className="flex-1" />
                <button
                    onClick={() => onApply?.(content)}
                    className="px-2 py-1 text-sm bg-blue-100 text-blue-700 rounded flex items-center gap-1 hover:bg-blue-200 transition-colors"
                >
                    📝 应用到表单
                </button>
            </div>

            {mode === "edit" ? (
                <textarea
                    value={content}
                    onChange={(e) => onChange?.(e.target.value)}
                    onSelect={handleSelection}
                    onKeyUp={handleSelection}
                    onClick={handleSelection}
                    className="flex-1 w-full p-4 outline-none resize-none bg-background text-foreground"
                    placeholder="在此编辑，支持 Markdown 语法..."
                />
            ) : (
                <div className="flex-1 p-6 overflow-y-auto prose dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {content ||
                            "这里展示生成的陈述内容。左侧表单不会自动出现在此处，请点击上方“AI 生成陈述”生成，或切换到“编辑”手动撰写。"}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
}
