"use client";

import { ArrowLeft, FileDown, Save, Share2, Sparkles } from "lucide-react";
import Link from "next/link";

const buttonBase =
    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

const buttonVariants = {
    solid: "bg-white text-slate-900 hover:bg-slate-100",
    outline: "border border-white/30 text-white hover:border-white/60 hover:bg-white/5",
    ghost: "text-white/90 hover:text-white hover:bg-white/10",
};

export function StageHeader({
    title,
    description,
    projectId,
}: {
    title: string;
    description: string;
    projectId?: string;
}) {
    return (
        <header className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white shadow-lg">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-24 top-0 h-36 w-36 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="absolute right-10 -bottom-16 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
            <div className="relative mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
                <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-200/80">
                    {projectId && (
                        <Link
                            href={`/project/${projectId}`}
                            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur transition hover:bg-white/15"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            返回项目
                        </Link>
                    )}
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 backdrop-blur">
                        <Sparkles className="h-3.5 w-3.5" />
                        课程规划工作台
                    </span>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-white/70 backdrop-blur">
                        Live draft, collaborative friendly
                    </span>
                </div>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/70 backdrop-blur">
                            当前阶段
                        </div>
                        <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
                            {title}
                        </h1>
                        <p className="max-w-3xl text-sm leading-relaxed text-white/80">
                            {description}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button className={`${buttonBase} ${buttonVariants.ghost}`} type="button">
                            <Share2 className="h-4 w-4" />
                            分享
                        </button>
                        <button className={`${buttonBase} ${buttonVariants.outline}`} type="button">
                            <FileDown className="h-4 w-4" />
                            导出
                        </button>
                        <button className={`${buttonBase} ${buttonVariants.solid}`} type="button">
                            <Save className="h-4 w-4" />
                            快速保存
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
