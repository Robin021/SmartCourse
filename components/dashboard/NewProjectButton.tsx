"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewProjectButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push("/project/new")}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-cyan-600 px-6 py-3 font-medium text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 hover:bg-cyan-500 hover:shadow-xl active:scale-95 dark:bg-cyan-500 dark:text-white dark:hover:bg-cyan-400"
        >
            <span className="relative z-10 flex items-center gap-2">
                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                New Project
            </span>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 opacity-0 transition-opacity duration-500 group-hover:opacity-15" />
        </button>
    );
}
