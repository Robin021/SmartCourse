"use client";

import { useMemo, useState } from "react";

type ExportFormat = "text" | "docx" | "pdf" | "pptx";

interface ExportPanelProps {
    projectId: string;
    stages: Array<{ stage_id: string; name: string; status?: string }>;
}

function parseFilename(disposition: string | null): string | null {
    if (!disposition) return null;
    const match = /filename\*?=([^;]+)/i.exec(disposition);
    if (match?.[1]) {
        const raw = match[1].replace(/(^")|("$)/g, "");
        try {
            return decodeURIComponent(raw);
        } catch {
            return raw;
        }
    }
    return null;
}

export function ExportPanel({ projectId, stages }: ExportPanelProps) {
    const [format, setFormat] = useState<ExportFormat>("text");
    const [selectedStages, setSelectedStages] = useState<string[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const filenameFallback = useMemo(() => {
        const ext = format === "text" ? "txt" : format;
        return `export.${ext}`;
    }, [format]);

    const toggleStage = (stageId: string) => {
        setSelectedStages((prev) =>
            prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
        );
    };

    const handleExport = async () => {
        setIsExporting(true);
        setError(null);
        try {
            const res = await fetch(`/api/project/${projectId}/export`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ format, stages: selectedStages }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "导出失败");
            }

            const blob = await res.blob();
            const filename = parseFilename(res.headers.get("Content-Disposition")) || filenameFallback;

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            setError(err.message || "导出失败，请稍后重试");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex items-start justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-foreground">导出课程设计</p>
                    <p className="text-xs text-muted-foreground">支持 Word / PDF / PPTX，多阶段一键打包</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
                >
                    {isExporting ? "导出中..." : "导出"}
                </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                    格式
                    <select
                        value={format}
                        onChange={(e) => setFormat(e.target.value as ExportFormat)}
                        className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-foreground shadow-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
                    >
                        <option value="text">文本 (Markdown)</option>
                        <option value="docx">Word (.docx)</option>
                        <option value="pdf">PDF (.pdf)</option>
                        <option value="pptx">PPT (.pptx)</option>
                    </select>
                </label>

                <div className="space-y-1 text-xs font-medium text-muted-foreground">
                    <div>阶段（留空则导出全部）</div>
                    <div className="flex flex-wrap gap-2">
                        {stages.map((stage) => {
                            const active = selectedStages.includes(stage.stage_id);
                            return (
                                <button
                                    key={stage.stage_id}
                                    type="button"
                                    onClick={() => toggleStage(stage.stage_id)}
                                    className={`rounded-full border px-3 py-1 text-[11px] transition ${
                                        active
                                            ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-200"
                                            : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                                    }`}
                                >
                                    {stage.stage_id} {stage.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
        </div>
    );
}

export default ExportPanel;
