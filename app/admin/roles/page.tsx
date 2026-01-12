"use client";

import { useEffect, useState } from "react";
import { Shield, Loader2 } from "lucide-react";

export default function RolesPage() {
    const [roles, setRoles] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/roles")
            .then((res) => res.json())
            .then((data) => {
                if (data.roles) setRoles(data.roles);
            })
            .catch((err) => console.error("Failed to fetch roles", err))
            .finally(() => setLoading(false));
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                    <Shield className="h-6 w-6 text-cyan-700 dark:text-cyan-400" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Role Management
                </h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {loading ? (
                    <div className="col-span-full flex h-32 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
                    </div>
                ) : (
                    roles.map((role) => (
                        <div
                            key={role}
                            className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                                <Shield className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                            </div>
                            <div>
                                <h3 className="font-medium text-slate-900 dark:text-white">
                                    {role}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    System Role
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Note:</strong> Roles are currently defined by the system configuration and cannot be added or removed dynamically.
                </p>
            </div>
        </div>
    );
}
