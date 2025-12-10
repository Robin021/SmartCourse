import DashboardHeader from "@/components/dashboard/DashboardHeader";
import ProjectCard from "@/components/dashboard/ProjectCard";
import { cookies } from "next/headers";

async function fetchProjects() {
    try {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join("; ");
        const base =
            process.env.NEXT_PUBLIC_BASE_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
        const res = await fetch(`${base}/api/projects`, {
            cache: "no-store",
            headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        });
        if (!res.ok) {
            return [];
        }
        if (!res.headers.get("content-type")?.includes("application/json")) {
            return [];
        }
        const data = await res.json().catch(() => ({ projects: [] }));
        return (data.projects || []).map((p: any) => ({
            ...p,
            _id: p._id.toString(),
        }));
    } catch (error) {
        console.error("Error fetching projects:", error);
        return [];
    }
}

async function fetchUser() {
    try {
        const cookieStore = await cookies();
        const cookieHeader = cookieStore
            .getAll()
            .map((c) => `${c.name}=${c.value}`)
            .join("; ");
        const base =
            process.env.NEXT_PUBLIC_BASE_URL ||
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
        const res = await fetch(`${base}/api/auth/me`, {
            cache: "no-store",
            headers: cookieHeader ? { cookie: cookieHeader } : undefined,
        });
        if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
            return { full_name: "Teacher" };
        }
        const data = await res.json().catch(() => ({}));
        return { full_name: data.user?.full_name || "Teacher" };
    } catch {
        return { full_name: "Teacher" };
    }
}

export default async function Home() {
    const [projects, user] = await Promise.all([fetchProjects(), fetchUser()]);

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <DashboardHeader user={user} />

                {projects.length === 0 ? (
                    <div className="flex h-64 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900/50">
                        <h3 className="mt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            No projects
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Get started by creating a new school plan.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {projects.map((project) => (
                            <ProjectCard key={project._id} project={project} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
