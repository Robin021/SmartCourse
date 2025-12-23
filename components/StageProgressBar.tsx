import { cn } from "@/lib/utils";

type StageStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

interface StageProgressBarProps {
    stages: Array<{ stage_id: string; name: string; status?: StageStatus }>;
    overallProgress?: number;
}

export function StageProgressBar({ stages, overallProgress }: StageProgressBarProps) {
    const completed = stages.filter((s) => s.status === "COMPLETED").length;
    const total = stages.length || 1;
    const percent =
        overallProgress !== undefined
            ? Math.min(100, Math.max(0, overallProgress))
            : Math.round((completed / total) * 100);

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50">
            <div className="mb-2 flex items-center justify-between text-sm text-muted-foreground">
                <span>阶段进度</span>
                <span className="font-medium text-foreground">{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                    className={cn(
                        "h-full bg-gradient-to-r from-emerald-500 via-cyan-500 to-sky-500 transition-all"
                    )}
                    style={{ width: `${percent}%` }}
                />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {stages.map((stage) => (
                    <span
                        key={stage.stage_id}
                        className={cn(
                            "rounded-full px-2.5 py-1 border",
                            stage.status === "COMPLETED" && "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400",
                            stage.status === "IN_PROGRESS" && "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900/50 dark:bg-cyan-900/20 dark:text-cyan-300",
                            (!stage.status || stage.status === "NOT_STARTED") && "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400"
                        )}
                    >
                        {stage.stage_id} {stage.name}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default StageProgressBar;
