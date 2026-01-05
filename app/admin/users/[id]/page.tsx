"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function EditUserPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [roles, setRoles] = useState<string[]>([]);

    // Form state
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        role: "",
        status: "",
        password: "", // Optional, only for updates
    });

    useEffect(() => {
        // Fetch roles
        fetch("/api/admin/roles")
            .then((res) => res.json())
            .then((data) => {
                if (data.roles) setRoles(data.roles);
            })
            .catch((err) => console.error("Failed to fetch roles", err));

        // Fetch user details
        if (id) {
            fetch(`/api/admin/users/${id}`)
                .then(async (res) => {
                    if (res.ok) {
                        const data = await res.json();
                        setFormData({
                            full_name: data.full_name,
                            email: data.email,
                            role: data.role,
                            status: data.status,
                            password: "",
                        });
                    } else {
                        alert("Failed to fetch user");
                        router.push("/admin/users");
                    }
                })
                .catch((err) => {
                    console.error("Failed to fetch user", err);
                })
                .finally(() => setLoading(false));
        }
    }, [id, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload: any = {
                full_name: formData.full_name,
                role: formData.role,
                status: formData.status,
            };

            // Only include password if provided
            if (formData.password) {
                payload.password = formData.password;
            }

            const res = await fetch(`/api/admin/users/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                router.push("/admin/users");
                router.refresh();
            } else {
                const data = await res.json();
                alert(data.error || "Failed to update user");
            }
        } catch (error) {
            console.error("Error updating user:", error);
            alert("An error occurred");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/users"
                    className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    Edit User
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg border border-slate-200 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email
                        </label>
                        <input
                            type="email"
                            disabled
                            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50"
                            value={formData.email}
                        />
                        <p className="mt-1 text-xs text-slate-400">Email cannot be changed.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Full Name
                        </label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            New Password <span className="text-slate-400 font-normal">(Optional)</span>
                        </label>
                        <input
                            type="password"
                            minLength={6}
                            placeholder="Leave blank to keep current password"
                            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Role
                            </label>
                            <select
                                required
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                {roles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Status
                            </label>
                            <select
                                required
                                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="SUSPENDED">SUSPENDED</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50 transition-colors"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}
