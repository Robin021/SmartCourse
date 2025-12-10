"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import StageCard from "@/components/project/StageCard";
import StageProgressBar from "@/components/StageProgressBar";
import ChatWindow from "@/components/chat/ChatWindow";
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
            <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (error || !project) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
                <p className="text-red-500">{error || "Project not found"}</p>
                <Link
                    href="/"
                    className="text-sm font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100"
                >
                    Back to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <main className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                            {project.name}
                        </h1>
                    </div>
                </div>
            </header>

            {/* Split View */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Stages */}
                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    <div className="mx-auto max-w-3xl space-y-6">
                        <div className="mb-6 space-y-4">
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                Project Stages
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Complete these stages to build your plan.
                            </p>
                            <StageProgressBar
                                stages={project.stages}
                                overallProgress={project.overall_progress}
                            />
                            <ExportPanel projectId={project._id} stages={project.stages} />
                        </div>
                        <div className="space-y-4">
                            {project.stages.map((stage) => (
                                <StageCard key={stage.stage_id} stage={stage} projectId={project._id} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Chat */}
                <div className="w-[400px] shrink-0 border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:w-[450px]">
                    <ChatWindow projectId={project._id} />
                </div>
            </div>
        </main>
    );
}
