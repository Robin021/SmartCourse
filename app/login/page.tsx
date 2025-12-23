"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Login failed");
            }

            router.push("/");
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-cyan-50/50 to-white px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-20 right-0 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-500/10" />
                <div className="absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-500/10" />
            </div>
            <div className="relative w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
                        Sign in to SmartCourse
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        Or use the demo account: teacher@demo.com / password
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/90 text-card-foreground shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
                    <div className="p-6 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
                                    {error}
                                </div>
                            )}
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="name@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label
                                    htmlFor="password"
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                                    "bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full"
                                )}
                            >
                                {loading ? "Signing in..." : "Sign in"}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
