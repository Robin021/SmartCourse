"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
    CheckCircle2,
    Circle,
    Lock,
    LayoutDashboard,
    FileText,
} from "lucide-react";

interface Stage {
    id: string;
    name: string;
    status: "LOCKED" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
}

const stages: Stage[] = [
    { id: "Q1", name: "学校课程情境", status: "COMPLETED" },
    { id: "Q2", name: "教育哲学", status: "IN_PROGRESS" },
    { id: "Q3", name: "办学理念", status: "NOT_STARTED" },
    { id: "Q4", name: "育人目标", status: "LOCKED" },
    { id: "Q5", name: "课程命名", status: "LOCKED" },
    { id: "Q6", name: "课程理念", status: "LOCKED" },
    { id: "Q7", name: "目标细化", status: "LOCKED" },
    { id: "Q8", name: "结构设计", status: "LOCKED" },
    { id: "Q9", name: "实施方案", status: "LOCKED" },
    { id: "Q10", name: "评价体系", status: "LOCKED" },
];

export function StageSidebar({ projectId }: { projectId: string }) {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const sidebarWidth = collapsed ? "w-14" : "w-64";

    return (
        <div className={`${sidebarWidth} border-r bg-gray-50/40 dark:bg-zinc-900/50 h-screen flex flex-col transition-all duration-200`}>
            <div className="p-4 border-b h-14 flex items-center justify-between gap-2">
                <Link
                    href={`/project/${projectId}`}
                    className="flex items-center gap-2 font-semibold text-sm"
                >
                    <LayoutDashboard className="h-4 w-4" />
                    {!collapsed && <span>Project Dashboard</span>}
                </Link>
                <button
                    onClick={() => setCollapsed((v) => !v)}
                    className="text-xs px-2 py-1 rounded border hover:bg-muted"
                    aria-label={collapsed ? "展开阶段导航" : "折叠阶段导航"}
                >
                    {collapsed ? "»" : "«"}
                </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                {!collapsed && (
                    <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Planning Stages
                    </div>
                )}
                <nav className="space-y-1 px-2">
                    {stages.map((stage) => {
                        const isActive = pathname.includes(`/stage/${stage.id}`);
                        return (
                            <Link
                                key={stage.id}
                                href={`/project/${projectId}/stage/${stage.id}`}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                    stage.status === "LOCKED" && "opacity-50 pointer-events-none"
                                )}
                                title={`${stage.id}. ${stage.name}`}
                            >
                                {stage.status === "COMPLETED" ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : stage.status === "LOCKED" ? (
                                    <Lock className="h-4 w-4" />
                                ) : (
                                    <Circle className="h-4 w-4" />
                                )}
                                {!collapsed && (
                                    <span className="truncate">
                                        {stage.id}. {stage.name}
                                    </span>
                                )}
                                {collapsed && <span className="text-xs">{stage.id}</span>}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="p-4 border-t">
                <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        DT
                    </div>
                    {!collapsed && (
                        <div className="flex flex-col">
                            <span className="text-foreground">Demo Teacher</span>
                            <span className="text-xs">Teacher</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
