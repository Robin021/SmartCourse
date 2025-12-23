import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProjectCard from "@/components/dashboard/ProjectCard";
import type { ProjectSummary } from "@/components/dashboard/ProjectCard";
import { cookies } from "next/headers";

const getBaseUrl = () =>
  process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
  (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000");

const buildApiUrl = (path: string) => {
  try {
    return new URL(path, getBaseUrl()).toString();
  } catch {
    return `${getBaseUrl()}${path}`;
  }
};

async function fetchProjects(): Promise<ProjectSummary[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const res = await fetch(buildApiUrl("/api/projects"), {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      return [];
    }
    if (!res.headers.get("content-type")?.includes("application/json")) {
      return [];
    }
    const data = await res.json().catch(() => ({ projects: [] as unknown[] }));
    const raw = Array.isArray((data as any).projects)
      ? (data as any).projects
      : [];

    return raw.map((p: any): ProjectSummary => {
      const updated =
        typeof p?.updatedAt === "string"
          ? p.updatedAt
          : p?.updatedAt
          ? new Date(p.updatedAt).toISOString()
          : p?.updated_at
          ? new Date(p.updated_at).toISOString()
          : new Date().toISOString();

      return {
        _id: String(p?._id ?? ""),
        name: String(p?.name ?? ""),
        updatedAt: updated,
        current_stage: String(p?.current_stage ?? "Q1"),
        status: typeof p?.status === "string" ? p.status : undefined,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return [];
    }
    console.error("Error fetching projects:", error);
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchUser() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    const res = await fetch(buildApiUrl("/api/auth/me"), {
      cache: "no-store",
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      signal: controller.signal,
    });
    if (
      !res.ok ||
      !res.headers.get("content-type")?.includes("application/json")
    ) {
      return { full_name: "Teacher" };
    }
    const data = await res.json().catch(() => ({}));
    return { full_name: data.user?.full_name || "Teacher" };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { full_name: "Teacher" };
    }
    return { full_name: "Teacher" };
  } finally {
    clearTimeout(timeout);
  }
}

export default async function Home() {
  const [projects, user] = await Promise.all([fetchProjects(), fetchUser()]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-cyan-50/40 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <DashboardHeader user={user} />

        {projects.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 p-12 text-center shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/50">
            <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
              No plans yet
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create your first school plan to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project: ProjectSummary) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
