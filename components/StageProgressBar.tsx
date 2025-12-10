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
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>阶段进度</span>
                <span className="font-medium text-foreground">{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                    className={cn(
                        "h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all"
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
                            stage.status === "IN_PROGRESS" && "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-900/20 dark:text-indigo-400",
                            (!stage.status || stage.status === "NOT_STARTED") && "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400"
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
