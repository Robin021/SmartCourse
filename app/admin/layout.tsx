"use client";

import { LayoutDashboard, Settings, Database, FileText, Globe } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/dashboard/LogoutButton";

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const navItems = [
        {
            name: "Dashboard",
            href: "/admin",
            icon: LayoutDashboard,
        },
        {
            name: "LLM Settings",
            href: "/admin/settings/llm",
            icon: Settings,
        },
        {
            name: "Storage",
            href: "/admin/settings/storage",
            icon: Database,
        },
        {
            name: "Web Search",
            href: "/admin/settings/web-search",
            icon: Globe,
        },
        {
            name: "Prompts",
            href: "/admin/settings/prompts",
            icon: FileText,
        },
        {
            name: "Knowledge Base",
            href: "/admin/kb",
            icon: Database,
        },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Sidebar */}
            <aside className="fixed inset-y-0 left-0 w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <div className="flex h-16 items-center border-b border-slate-200 px-6 dark:border-slate-800">
                    <span className="text-lg font-semibold text-slate-900 dark:text-white">
                        SmartCourse Admin
                    </span>
                </div>
                <nav className="flex flex-col justify-between h-[calc(100vh-4rem)] p-4">
                    <div className="space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive
                                        ? "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                    <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
                        <LogoutButton />
                    </div>
                </nav>
            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 overflow-y-auto p-8">{children}</main>
        </div>
    );
}
