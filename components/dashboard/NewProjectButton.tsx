"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewProjectButton() {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push("/project/new")}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-zinc-900 px-6 py-3 font-medium text-white shadow-lg transition-all hover:bg-zinc-800 hover:shadow-xl hover:scale-105 active:scale-95 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
        >
            <span className="relative z-10 flex items-center gap-2">
                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                New Project
            </span>
            <div className="absolute inset-0 -z-10 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 transition-opacity duration-500 group-hover:opacity-10" />
        </button>
    );
}
