"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import StageCard from "@/components/project/StageCard";
import StageProgressBar from "@/components/StageProgressBar";
import { useParams } from "next/navigation";
import ExportPanel from "@/components/export/ExportPanel";

interface ProjectDetail {
    _id: string;
    name: string;
    stages: any[];
    overall_progress?: number;
}

export default function ProjectDetailPage() {
    const params = useParams<{ id: string }>();
    const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const [project, setProject] = useState<ProjectDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!projectId) return;

        const fetchProject = async () => {
            try {
                const res = await fetch(`/api/projects/${projectId}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Failed to fetch project");
                }

                setProject(data.project);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProject();
    }, [projectId]);

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/40 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 via-cyan-50/40 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                <p className="text-red-500">{error || "Project not found"}</p>
                <Link
                    href="/"
                    className="text-sm font-medium text-slate-900 underline underline-offset-4 dark:text-white"
                >
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <main className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-cyan-50/40 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/80">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                            {project.name}
                        </h1>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="mx-auto w-full max-w-6xl space-y-6">
                        <div className="mb-6 space-y-4">
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                                Project Stages
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Complete these stages to build your plan.
                            </p>
                            <StageProgressBar
                                stages={project.stages}
                                overallProgress={project.overall_progress}
                            />
                            <ExportPanel projectId={project._id} stages={project.stages} />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {project.stages.map((stage) => (
                                <StageCard key={stage.stage_id} stage={stage} projectId={project._id} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
