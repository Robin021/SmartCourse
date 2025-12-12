"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Clock,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";

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
  onRollback?: () => void; // 回滚成功后的回调
}

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString("zh-CN", {
    hour12: false,
  });

const formatRelativeTime = (date: string) => {
  const deltaMs = Date.now() - new Date(date).getTime();
  const deltaMinutes = Math.round(deltaMs / 60000);
  if (deltaMinutes < 1) return "刚刚";
  if (deltaMinutes < 60) return `${deltaMinutes} 分钟前`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours} 小时前`;
  const deltaDays = Math.round(deltaHours / 24);
  if (deltaDays < 7) return `${deltaDays} 天前`;
  const deltaWeeks = Math.round(deltaDays / 7);
  return `${deltaWeeks} 周前`;
};

export function VersionHistory({
  projectId,
  stageId,
  onRollback,
}: VersionHistoryProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollingBack, setRollingBack] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [showCleanup, setShowCleanup] = useState(false);
  const [keepCount, setKeepCount] = useState(10);

  const loadVersions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/project/${projectId}/versions/${stageId}`);
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Failed to load versions");
      setVersions(data.versions || []);
    } catch (err: any) {
      setError(err.message || "加载失败");
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
      if (!res.ok || !data.success)
        throw new Error(data.error || "Rollback failed");
      await loadVersions();
      // 回滚成功后通知父组件刷新内容
      onRollback?.();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRollingBack(null);
    }
  };

  const handleDelete = async (version: number) => {
    if (!confirm(`确定要删除版本 v${version} 吗？此操作不可恢复。`)) {
      return;
    }
    setDeleting(version);
    setError("");
    try {
      const res = await fetch(`/api/project/${projectId}/versions/${stageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", version }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Delete failed");
      await loadVersions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleCleanup = async () => {
    if (
      !confirm(
        `确定要清理旧版本吗？将只保留最新的 ${keepCount} 个版本，其他版本将被永久删除。`
      )
    ) {
      return;
    }
    setError("");
    try {
      const res = await fetch(`/api/project/${projectId}/versions/${stageId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cleanup", keepCount }),
      });
      const data = await res.json();
      if (!res.ok || !data.success)
        throw new Error(data.error || "Cleanup failed");
      await loadVersions();
      setShowCleanup(false);
      alert(data.message || `已清理 ${data.deletedCount || 0} 个旧版本`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadVersions();
  }, [projectId, stageId]);

  const sortedVersions = useMemo(
    () => [...versions].sort((a, b) => b.version - a.version),
    [versions]
  );

  const stats = useMemo(() => {
    const ai = versions.filter((v) => v.is_ai_generated).length;
    const human = versions.length - ai;
    return { ai, human, total: versions.length };
  }, [versions]);

  return (
    <div className="space-y-3 rounded-[14px] border border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-4 text-white shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white">
            <History className="h-4 w-4" />
          </div>
          <div className="leading-tight">
            <h3 className="text-sm font-semibold">版本历史</h3>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">
              最近 20 个版本，可回滚
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {versions.length > 10 && (
            <button
              onClick={() => setShowCleanup((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-50 transition hover:border-amber-400/60 hover:bg-amber-500/25"
              type="button"
            >
              清理旧版本
            </button>
          )}
          <button
            onClick={loadVersions}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:text-white disabled:opacity-60"
            disabled={loading}
            type="button"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            刷新
          </button>
        </div>
      </div>

      {showCleanup && (
        <div className="rounded-[14px] border border-amber-400/30 bg-amber-500/15 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-50">
              清理旧版本
            </span>
            <button
              onClick={() => setShowCleanup(false)}
              className="text-amber-200 hover:text-white"
              type="button"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mb-2 text-xs text-amber-50/80">
            仅保留最新版本，其他版本将被永久删除。
          </p>
          <div className="flex items-center gap-2">
            <select
              value={keepCount}
              onChange={(e) => setKeepCount(Number(e.target.value))}
              className="text-xs rounded-lg border border-amber-400/40 bg-white/10 px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-400/40"
            >
              <option value="5">5 个</option>
              <option value="10">10 个</option>
              <option value="20">20 个</option>
              <option value="50">50 个</option>
            </select>
            <button
              onClick={handleCleanup}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-300/60 bg-amber-400/20 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-amber-200 hover:bg-amber-400/30"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
              执行清理
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-[14px] border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="text-white/60">总版本</div>
          <div className="text-lg font-semibold text-white">{stats.total}</div>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="flex items-center gap-1 text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            AI 生成
          </div>
          <div className="text-lg font-semibold text-white">{stats.ai}</div>
        </div>
        <div className="rounded-[14px] border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="flex items-center gap-1 text-white/60">
            <User className="h-3.5 w-3.5" />
            人工
          </div>
          <div className="text-lg font-semibold text-white">{stats.human}</div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/70">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : sortedVersions.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-white/60">
          暂无版本，生成内容后可查看历史。
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/50">
            最新优先
          </div>
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {sortedVersions.map((v, idx) => {
              const isLatest = idx === 0;
              const isRollingBack = rollingBack === v.version;
              return (
                <div
                  key={v._id}
                  className={cn(
                    "relative flex items-start gap-3 rounded-[14px] border px-3.5 py-3 text-sm transition",
                    isLatest
                      ? "border-cyan-400/40 bg-cyan-500/10 shadow-md shadow-cyan-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  )}
                >
                  <div className="flex h-10 w-12 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
                    v{v.version}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                      <span className="truncate">{v.author?.name || "AI"}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        {v.is_ai_generated ? "AI 生成" : "人工编辑"}
                      </span>
                      {isLatest && (
                        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-100 ring-1 ring-emerald-400/40">
                          当前
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/70">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDateTime(v.created_at)}
                      </span>
                      <span className="text-white/50">•</span>
                      <span>{formatRelativeTime(v.created_at)}</span>
                    </div>
                    {v.change_note && (
                      <div className="mt-1 rounded-lg bg-white/5 px-2 py-1 text-xs text-white/80">
                        备注：{v.change_note}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-stretch gap-2">
                    <button
                      onClick={() => handleRollback(v.version)}
                      disabled={rollingBack !== null || deleting !== null}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:opacity-60"
                      type="button"
                    >
                      {isRollingBack ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5" />
                      )}
                      回滚
                    </button>
                    <button
                      onClick={() => handleDelete(v.version)}
                      disabled={rollingBack !== null || deleting !== null}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-200 transition hover:border-red-400/60 hover:bg-red-500/20 disabled:opacity-60"
                      type="button"
                    >
                      {deleting === v.version ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default VersionHistory;
