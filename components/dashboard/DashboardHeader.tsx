import NewProjectButton from "./NewProjectButton";
import LogoutButton from "./LogoutButton";

interface DashboardHeaderProps {
    user?: {
        full_name: string;
    };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
    return (
        <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                    Welcome back,{" "}
                    <span className="bg-gradient-to-r from-cyan-500 via-emerald-400 to-sky-500 bg-clip-text text-transparent">
                        {user?.full_name || "Teacher"}
                    </span>
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400">
                    Plan, draft, and export curriculum projects with AI support.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <LogoutButton />
                <NewProjectButton />
            </div>
        </div>
    );
}
