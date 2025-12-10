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
        <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
            <div className="w-full max-w-md space-y-8">
                <div className="flex items-center gap-4">
                    <Link
                        href="/"
                        className="rounded-full p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                        Create New Project
                    </h1>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="name"
                                className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
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
                                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-zinc-900 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
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
                            className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-all hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
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
