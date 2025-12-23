"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create project");
            }

            router.push("/"); // Redirect to dashboard for now, later to project detail
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/40 to-white p-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-16 right-0 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
                <div className="absolute -bottom-24 left-6 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
            </div>
            <div className="relative w-full max-w-md space-y-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Create New Project
                    </h1>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="name"
                                className="text-sm font-medium text-slate-900 dark:text-white"
                            >
                                Project Name
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Fall 2025 School Plan"
                                required
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 outline-none transition-all focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex w-full items-center justify-center rounded-lg bg-cyan-600 px-4 py-2 font-medium text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-500 disabled:opacity-50 dark:bg-cyan-500 dark:text-white dark:hover:bg-cyan-400"
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : null}
                            Create Project
                        </button>
                    </form>
                </div>
            </div>
        </main>
    );
}
