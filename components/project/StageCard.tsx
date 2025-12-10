import { CheckCircle2, Circle, Clock, ArrowRight } from "lucide-react";
import Link from "next/link";

interface StageCardProps {
    stage: {
        stage_id: string;
        name: string;
        description: string;
        status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    };
    projectId: string;
}

export default function StageCard({ stage, projectId }: StageCardProps) {
    const statusConfig = {
        NOT_STARTED: {
            icon: Circle,
            color: "text-zinc-400",
            bg: "bg-zinc-100 dark:bg-zinc-800",
            text: "Not Started",
        },
        IN_PROGRESS: {
            icon: Clock,
            color: "text-indigo-500",
            bg: "bg-indigo-50 dark:bg-indigo-500/10",
            text: "In Progress",
        },
        COMPLETED: {
            icon: CheckCircle2,
            color: "text-emerald-500",
            bg: "bg-emerald-50 dark:bg-emerald-500/10",
            text: "Completed",
        },
    };

    const config = statusConfig[stage.status] || statusConfig.NOT_STARTED;
    const Icon = config.icon;

    return (
        <Link
            href={`/project/${projectId}/stage/${stage.stage_id}`}
            className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-500/50 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50"
        >
            <div className="flex items-start gap-4">
                <div
                    className={`mt-1 flex h-10 w-10 items-center justify-center rounded-full ${config.bg} ${config.color}`}
                >
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        {stage.name}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {stage.description}
                    </p>
                    <div className="mt-2 inline-flex items-center rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs font-medium dark:border-zinc-700">
                        <span className={`mr-1.5 h-2 w-2 rounded-full ${config.color.replace("text-", "bg-")}`} />
                        {config.text}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-400 transition-colors group-hover:bg-zinc-100 group-hover:text-zinc-900 dark:group-hover:bg-zinc-800 dark:group-hover:text-zinc-100">
                    <ArrowRight className="h-5 w-5" />
                </div>
            </div>
        </Link>
    );
}
