"use client";

import { X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Mermaid from "@/components/ui/Mermaid";

interface ExportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    data: {
        sections: Array<{
            stageId: string;
            name: string;
            description?: string;
            status?: string;
            content: string;
            keywords?: string[];
            score?: number;
            tableRows?: Array<{ key: string; value: string }>;
        }>;
    } | null;
    error?: string | null;
}

export function ExportPreviewModal({
    isOpen,
    onClose,
    isLoading,
    data,
    error,
}: ExportPreviewModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
                <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-foreground">导出预览</h2>
                            <p className="text-xs text-muted-foreground">
                                预览即将导出的文档内容
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto bg-zinc-50/50 p-6 dark:bg-zinc-900/50">
                    {isLoading ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600 dark:border-indigo-900 dark:border-t-indigo-500" />
                            <p className="text-sm">正在生成预览...</p>
                        </div>
                    ) : error ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-red-500">
                            <AlertCircle className="h-8 w-8" />
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : data ? (
                        <div className="space-y-6">
                            {data.sections.map((section) => (
                                <div
                                    key={section.stageId}
                                    className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <div className="mb-4 border-b border-zinc-100 pb-4 dark:border-zinc-800">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-foreground">
                                                    {section.stageId} {section.name}
                                                </h3>
                                                {section.description && (
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {section.description}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                {section.status && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {section.status}
                                                    </span>
                                                )}
                                                {section.score !== undefined && (
                                                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                        评分: {section.score}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-headings:font-semibold">
                                        {section.content === "（无生成内容）" ? (
                                            <span className="italic text-muted-foreground">（该阶段暂无生成内容）</span>
                                        ) : (
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    code({ node, inline, className, children, ...props }: any) {
                                                        const match = /language-(\w+)/.exec(className || "");
                                                        const isMermaid = match && match[1] === "mermaid";

                                                        if (!inline && isMermaid) {
                                                            return <Mermaid chart={String(children).replace(/\n$/, "")} />;
                                                        }

                                                        return (
                                                            <code className={className} {...props}>
                                                                {children}
                                                            </code>
                                                        );
                                                    }
                                                }}
                                            >
                                                {section.content}
                                            </ReactMarkdown>
                                        )}
                                    </div>

                                    {(section.keywords?.length || section.tableRows?.length) && (
                                        <div className="mt-6 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800/50">
                                            {section.keywords && section.keywords.length > 0 && (
                                                <div className="mb-3">
                                                    <span className="mr-2 text-xs font-semibold text-muted-foreground">
                                                        关键词:
                                                    </span>
                                                    <div className="mt-1 flex flex-wrap gap-1.5">
                                                        {section.keywords.map((kw, i) => (
                                                            <span
                                                                key={i}
                                                                className="rounded bg-white px-1.5 py-0.5 text-xs text-zinc-600 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:ring-zinc-600"
                                                            >
                                                                {kw}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {section.tableRows && section.tableRows.length > 0 && (
                                                <div>
                                                    <span className="mb-2 block text-xs font-semibold text-muted-foreground">
                                                        关键信息:
                                                    </span>
                                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                                        {section.tableRows.map((row, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="flex flex-col rounded border border-zinc-200/50 bg-white p-2 dark:border-zinc-700/50 dark:bg-zinc-800"
                                                            >
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    {row.key}
                                                                </span>
                                                                <span className="text-sm font-medium text-foreground">
                                                                    {row.value || "—"}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>

                <div className="flex items-center justify-end border-t border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        关闭预览
                    </button>
                </div>
            </div>
        </div>
    );
}
