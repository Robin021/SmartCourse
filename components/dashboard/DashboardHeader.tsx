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
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
                    Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">{user?.full_name || "Teacher"}</span>
                </h1>
                <p className="text-lg text-zinc-500 dark:text-zinc-400">
                    Manage your school plans and course designs.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <LogoutButton />
                <NewProjectButton />
            </div>
        </div>
    );
}
