"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

interface Version {
    _id: string;
    version: number;
    created_at: string;
    author?: { name?: string };
    is_ai_generated?: boolean;
    change_note?: string;
}

interface VersionHistoryProps {
    projectId: string;
    stageId: string;
}

export function VersionHistory({ projectId, stageId }: VersionHistoryProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [loading, setLoading] = useState(false);
    const [rollingBack, setRollingBack] = useState<number | null>(null);
    const [error, setError] = useState("");

    const loadVersions = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/project/${projectId}/versions/${stageId}`);
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed to load versions");
            setVersions(data.versions || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRollback = async (version: number) => {
        setRollingBack(version);
        setError("");
        try {
            const res = await fetch(`/api/project/${projectId}/versions/${stageId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "rollback", version }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Rollback failed");
            await loadVersions();
            alert(`已回滚到版本 v${version}`);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRollingBack(null);
        }
    };

    useEffect(() => {
        loadVersions();
    }, [projectId, stageId]);

    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h3 className="text-sm font-semibold text-foreground">版本历史</h3>
                    <p className="text-xs text-muted-foreground">最近 20 个版本，可回滚</p>
                </div>
                <button
                    onClick={loadVersions}
                    className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
                    disabled={loading}
                >
                    刷新
                </button>
            </div>
            {loading ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    加载中...
                </div>
            ) : error ? (
                <div className="text-sm text-red-500">{error}</div>
            ) : versions.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无版本</div>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {versions.map((v) => (
                        <div
                            key={v._id}
                            className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
                        >
                            <div>
                                <div className="font-medium text-foreground">v{v.version}</div>
                                <div className="text-xs text-muted-foreground">
                                    {v.author?.name || "AI"} • {new Date(v.created_at).toLocaleString()}
                                </div>
                                {v.change_note && (
                                    <div className="text-xs text-muted-foreground">备注: {v.change_note}</div>
                                )}
                            </div>
                            <button
                                onClick={() => handleRollback(v.version)}
                                disabled={rollingBack !== null}
                                className="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            >
                                {rollingBack === v.version ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <RotateCcw className="h-3 w-3" />
                                )}
                                回滚
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default VersionHistory;
