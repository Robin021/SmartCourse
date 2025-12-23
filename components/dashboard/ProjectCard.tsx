"use client";

import { Calendar, ChevronRight, MoreVertical } from "lucide-react";
import Link from "next/link";

export type ProjectSummary = {
  _id: string;
  name: string;
  updatedAt: string;
  current_stage: string;
  status?: string;
};

interface ProjectCardProps {
  project: ProjectSummary;
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const date = new Date(project.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Link
      href={`/project/${project._id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/10 dark:border-slate-800 dark:bg-slate-900/50"
    >
      <div className="mb-4 flex items-start justify-between">
        <div className="rounded-lg bg-cyan-50 p-3 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300">
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <button className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>

      <div>
        <h3 className="mb-2 text-xl font-semibold text-slate-900 transition-colors group-hover:text-cyan-600 dark:text-white dark:group-hover:text-cyan-300">
          {project.name}
        </h3>
        <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {date}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {project.current_stage}
          </span>
        </div>
      </div>

      <div className="absolute bottom-6 right-6 translate-x-4 transform opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        <ChevronRight className="h-6 w-6 text-cyan-500" />
      </div>
    </Link>
  );
}
