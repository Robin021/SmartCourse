"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  LayoutDashboard,
  Lock,
  Sparkles,
} from "lucide-react";

interface Stage {
  id: string;
  name: string;
  status: "LOCKED" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

// Fallback stages when API data is not available
const defaultStages: Stage[] = [
  { id: "Q1", name: "学校课程情境", status: "NOT_STARTED" },
  { id: "Q2", name: "教育哲学", status: "LOCKED" },
  { id: "Q3", name: "办学理念", status: "LOCKED" },
  { id: "Q4", name: "育人目标", status: "LOCKED" },
  { id: "Q5", name: "课程命名", status: "LOCKED" },
  { id: "Q6", name: "课程理念", status: "LOCKED" },
  { id: "Q7", name: "目标细化", status: "LOCKED" },
  { id: "Q8", name: "结构设计", status: "LOCKED" },
  { id: "Q9", name: "实施方案", status: "LOCKED" },
  { id: "Q10", name: "评价体系", status: "LOCKED" },
];

const statusStyles: Record<
  Stage["status"],
  { label: string; text: string; dot: string }
> = {
  COMPLETED: {
    label: "已完成",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  IN_PROGRESS: {
    label: "进行中",
    text: "text-cyan-300",
    dot: "bg-cyan-400",
  },
  NOT_STARTED: {
    label: "待开始",
    text: "text-white/70",
    dot: "bg-white/50",
  },
  LOCKED: {
    label: "已锁定",
    text: "text-white/50",
    dot: "bg-white/30",
  },
};

export function StageSidebar({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [stages, setStages] = useState<Stage[]>(defaultStages);
  const sidebarWidth = collapsed ? "w-[78px]" : "w-72";

  const normalizeStatus = useCallback((status?: string): Stage["status"] => {
    const upper = (status || "")
      .toString()
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
    if (upper === "COMPLETED") return "COMPLETED";
    if (upper === "IN_PROGRESS") return "IN_PROGRESS";
    if (upper === "LOCKED") return "LOCKED";
    return "NOT_STARTED";
  }, []);

  // Fetch stage progress from API
  const fetchProgress = useCallback(async () => {
    if (!projectId) return;

    try {
      const res = await fetch(`/api/project/${projectId}/progress`);
      if (!res.ok) throw new Error("Failed to fetch progress");
      const data = await res.json();

      const apiStages = Array.isArray(data.stages) ? data.stages : [];
      const apiStageMap = new Map<string, any>(
        apiStages.map((s: any) => [s.stage_id || s.id, s])
      );
      const defaultOrder = defaultStages.map((s) => s.id);
      const extraStageIds = apiStages
        .map((s: any) => s.stage_id || s.id)
        .filter(
          (id: unknown): id is string =>
            typeof id === "string" && Boolean(id) && !defaultOrder.includes(id)
        );
      const stageOrder = [...defaultOrder, ...extraStageIds];

      const mergedStages: Stage[] = [];
      stageOrder.forEach((id, index) => {
        const apiStage = apiStageMap.get(id);
        const name =
          apiStage?.name || defaultStages.find((s) => s.id === id)?.name || id;

        const baseStatus = normalizeStatus(apiStage?.status);
        const status =
          index > 0 &&
          baseStatus === "NOT_STARTED" &&
          mergedStages[index - 1]?.status !== "COMPLETED"
            ? "LOCKED"
            : baseStatus;

        mergedStages.push({
          id,
          name,
          status,
        });
      });

      setStages(mergedStages);
    } catch (error) {
      console.error("Failed to fetch stage progress:", error);
      setStages(defaultStages);
    }
  }, [normalizeStatus, projectId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Listen for stage completion events to refresh progress
  useEffect(() => {
    const handleStageComplete = () => {
      fetchProgress();
    };

    window.addEventListener("stage-completed", handleStageComplete);
    return () => {
      window.removeEventListener("stage-completed", handleStageComplete);
    };
  }, [fetchProgress]);

  const completedCount = useMemo(
    () => stages.filter((s) => s.status === "COMPLETED").length,
    [stages]
  );
  const progressPct = Math.max(
    8,
    Math.round((completedCount / stages.length) * 100)
  );

  return (
    <aside
      className={cn(
        "relative flex h-screen flex-col overflow-hidden border-r border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white shadow-xl transition-all duration-200",
        sidebarWidth
      )}
      aria-label="阶段导航栏"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-16 bottom-20 h-36 w-36 rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative flex items-center justify-between px-3.5 py-3">
        <Link
          href={`/project/${projectId}`}
          className="group flex items-center gap-2 overflow-hidden rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white/90 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/10"
        >
          <LayoutDashboard className="h-4 w-4" />
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span>Project</span>
              <span className="text-[11px] font-normal uppercase tracking-[0.2em] text-white/60">
                Dashboard
              </span>
            </div>
          )}
        </Link>
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 shadow-sm transition hover:border-white/30 hover:text-white"
          aria-label={collapsed ? "展开阶段导航" : "折叠阶段导航"}
          type="button"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="relative px-3.5 pb-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 shadow-inner shadow-black/10">
            <div className="flex items-center justify-between text-xs text-white/70">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                阶段进度
              </span>
              <span className="font-semibold text-white">
                {completedCount}/{stages.length}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 transition-all"
                style={{ width: `${progressPct}%` }}
                aria-hidden
              />
            </div>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto pb-6">
        {!collapsed && (
          <div className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">
            Planning Stages
          </div>
        )}
        <nav className="space-y-1 px-2">
          {stages.map((stage) => {
            const isActive = pathname?.includes(`/stage/${stage.id}`) ?? false;
            const meta = statusStyles[stage.status];
            const Icon =
              stage.status === "COMPLETED"
                ? CheckCircle2
                : stage.status === "LOCKED"
                ? Lock
                : Circle;

            return (
              <Link
                key={stage.id}
                href={`/project/${projectId}/stage/${stage.id}`}
                className={cn(
                  "group relative isolate flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-white/10 text-white shadow-lg shadow-cyan-500/10 ring-1 ring-white/30"
                    : "text-white/80 hover:-translate-y-0.5 hover:bg-white/5 hover:text-white",
                  stage.status === "LOCKED" &&
                    "cursor-not-allowed opacity-50 pointer-events-none"
                )}
                title={`${stage.id}. ${stage.name}`}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold tracking-wide",
                    isActive
                      ? "bg-white text-slate-900 shadow-lg shadow-white/30"
                      : "bg-white/10 text-white/90 ring-1 ring-white/10"
                  )}
                >
                  {stage.id}
                </span>
                {!collapsed && (
                  <div className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
                    <div className="flex flex-col overflow-hidden">
                      <span className="truncate">
                        {stage.id}. {stage.name}
                      </span>
                      <span
                        className={cn(
                          "text-[11px] font-semibold uppercase tracking-[0.18em]",
                          meta.text
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        stage.status === "COMPLETED" && "text-emerald-300",
                        stage.status === "IN_PROGRESS" && "text-cyan-300",
                        stage.status === "NOT_STARTED" && "text-white/60",
                        stage.status === "LOCKED" && "text-white/40"
                      )}
                    />
                  </div>
                )}
                {collapsed && (
                  <span
                    className={cn("flex h-2 w-2 rounded-full", meta.dot)}
                    aria-hidden
                  />
                )}
                <span
                  className={cn(
                    "absolute inset-0 -z-10 rounded-xl ring-1 transition",
                    isActive ? "ring-white/30" : "ring-white/5"
                  )}
                  aria-hidden
                />
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative border-t border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white shadow-inner shadow-black/10">
            DT
          </div>
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between gap-2">
              <div className="flex flex-col leading-tight">
                <span className="font-semibold text-white">Demo Teacher</span>
                <span className="text-xs text-white/70">课程规划负责人</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                <FileText className="h-3.5 w-3.5" />
                草稿保存中
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
