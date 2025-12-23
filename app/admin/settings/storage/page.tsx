"use client";

import { useState, useEffect } from "react";
import {
    Save,
    Loader2,
    CheckCircle2,
    Server,
    AlertCircle,
    RefreshCw,
    Plus,
    Trash2,
    Edit2,
    Database,
} from "lucide-react";

interface StorageProvider {
    _id?: string;
    name: string;
    provider: "s3" | "minio" | "aliyun" | "local";
    endpoint: string;
    region: string;
    bucket: string;
    access_key: string;
    secret_key: string;
    is_active: boolean;
}

export default function StorageSettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [providers, setProviders] = useState<StorageProvider[]>([]);

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [currentProvider, setCurrentProvider] = useState<StorageProvider>({
        name: "",
        provider: "local",
        endpoint: "",
        region: "us-east-1",
        bucket: "",
        access_key: "",
        secret_key: "",
        is_active: false,
    });

    // Validation State
    const [isTesting, setIsTesting] = useState(false);
    const [isVerified, setIsVerified] = useState(false); // Validated flag
    const [isSaving, setIsSaving] = useState(false);
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

    const fetchConfig = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/admin/config/storage");
            const data = await res.json();
            if (data.success) {
                setProviders(data.storage_providers || []);
            }
        } catch (error) {
            console.error("Failed to load config", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    // Reset verification when critical fields change
    const handleFieldChange = (field: keyof StorageProvider, value: any) => {
        setCurrentProvider((prev) => ({ ...prev, [field]: value }));
        // If critical fields change, invalidate verification
        if (["provider", "endpoint", "region", "bucket", "access_key", "secret_key"].includes(field)) {
            setIsVerified(false);
            setTestResult(null);
        }
    };

    const handleTestConnection = async () => {
        setIsTesting(true);
        setTestResult(null);

        try {
            const res = await fetch("/api/admin/config/storage/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storage: currentProvider }),
            });
            const data = await res.json();

            if (data.success) {
                setTestResult({ success: true, message: data.message });
                setIsVerified(true);
            } else {
                setTestResult({ success: false, message: data.error || "Connection test failed." });
                setIsVerified(false);
            }
        } catch (error) {
            setTestResult({ success: false, message: "Network error during test." });
            setIsVerified(false);
        } finally {
            setIsTesting(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Final Safety Check (should be disabled via UI anyway)
        if (!isVerified && currentProvider.provider !== "local") {
            // Allow local to save without explicit "test" since it's always valid, 
            // but strict mode says "Validation Required".
            // Local test returns success immediately anyway.
            alert("Please verify connection before saving.");
            return;
        }

        setIsSaving(true);

        try {
            const res = await fetch("/api/admin/config/storage", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: currentProvider }),
            });

            if (!res.ok) throw new Error("Failed to save");

            await fetchConfig();
            setIsEditing(false);
        } catch (error) {
            console.error("Save error", error);
            alert("Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this storage provider?")) return;
        try {
            await fetch(`/api/admin/config/storage?id=${id}`, { method: "DELETE" });
            fetchConfig();
        } catch (e) { console.error(e); }
    };

    const startNew = () => {
        setCurrentProvider({
            name: "",
            provider: "s3",
            endpoint: "",
            region: "us-east-1",
            bucket: "",
            access_key: "",
            secret_key: "",
            is_active: false,
        });
        setIsVerified(false);
        setTestResult(null);
        setIsEditing(true);
    };

    const startEdit = (p: StorageProvider) => {
        setCurrentProvider(p);
        // Assume existing saved ones were verified, BUT if they edit, they must re-verify.
        // Actually, forcing re-verification on edit is good practice.
        // But for UX, maybe we treat "unchanged" as verified? 
        // Simpler: treat as unverified. User must click test to save changes.
        setIsVerified(false);
        setTestResult(null);
        setIsEditing(true);
    };

    if (isLoading && !providers.length && !isEditing) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        Storage Configuration
                    </h1>
                    <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                        Manage your Knowledge Base storage.
                    </p>
                </div>
                {!isEditing && (
                    <button
                        onClick={startNew}
                        className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add Provider
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                            {currentProvider._id ? "Edit Provider" : "New Provider"}
                        </h2>
                        <button
                            onClick={() => setIsEditing(false)}
                            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                        >
                            Cancel
                        </button>
                    </div>

                    <form onSubmit={handleSave} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Friendly Name</label>
                            <input
                                type="text"
                                required
                                value={currentProvider.name}
                                onChange={(e) => handleFieldChange("name", e.target.value)}
                                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                                placeholder="e.g. Production MinIO"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Provider Type</label>
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                                {["local", "s3", "minio", "aliyun"].map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => handleFieldChange("provider", p)}
                                        className={`flex flex-col items-center justify-center gap-2 rounded-lg border p-4 text-sm font-medium transition-all ${currentProvider.provider === p
                                                ? "border-cyan-600 bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400"
                                                : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
                                            }`}
                                    >
                                        <Server className="h-5 w-5" />
                                        <span className="capitalize">{p}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {currentProvider.provider !== "local" && (
                            <>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Endpoint</label>
                                        <input
                                            type="text"
                                            value={currentProvider.endpoint}
                                            onChange={(e) => handleFieldChange("endpoint", e.target.value)}
                                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                                            placeholder="http://localhost:9000"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Region</label>
                                        <input
                                            type="text"
                                            value={currentProvider.region}
                                            onChange={(e) => handleFieldChange("region", e.target.value)}
                                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                                            placeholder="us-east-1"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Bucket</label>
                                    <input
                                        type="text"
                                        required
                                        value={currentProvider.bucket}
                                        onChange={(e) => handleFieldChange("bucket", e.target.value)}
                                        className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                                    />
                                </div>
                                <div className="grid gap-6 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Access Key</label>
                                        <input
                                            type="password"
                                            value={currentProvider.access_key}
                                            onChange={(e) => handleFieldChange("access_key", e.target.value)}
                                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Secret Key</label>
                                        <input
                                            type="password"
                                            value={currentProvider.secret_key}
                                            onChange={(e) => handleFieldChange("secret_key", e.target.value)}
                                            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                                            placeholder={currentProvider.secret_key === "********" ? "******** (Unchanged)" : "Enter Secret Key"}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={currentProvider.is_active}
                                onChange={(e) => setCurrentProvider(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                Set as Active Provider
                            </label>
                        </div>

                        {/* Test Feedback */}
                        {testResult && (
                            <div className={`flex items-center gap-2 rounded-lg border p-4 text-sm ${testResult.success
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400"
                                    : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400"
                                }`}>
                                {testResult.success ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                {testResult.message}
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-zinc-100 dark:border-zinc-800">
                            <button
                                type="button"
                                onClick={handleTestConnection}
                                disabled={isTesting}
                                className="flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                            >
                                {isTesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Test Connection
                            </button>

                            <button
                                type="submit"
                                disabled={isSaving || !isVerified}
                                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                            >
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Provider
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="space-y-4">
                    {providers.map((p) => (
                        <div
                            key={p._id}
                            className={`flex items-center justify-between rounded-xl border p-4 shadow-sm transition-all ${p.is_active
                                    ? "border-cyan-500/50 bg-cyan-50/10 dark:bg-cyan-900/10"
                                    : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                                }`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100/50 dark:bg-zinc-800/50">
                                    <Database className="h-5 w-5 text-zinc-500" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{p.name}</h3>
                                        <span className="text-xs uppercase text-zinc-500 border border-zinc-200 rounded px-1.5 py-0.5 dark:border-zinc-700">{p.provider}</span>
                                        {p.is_active && (
                                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                Active
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                        {p.provider === 'local' ? 'Local Filesystem' : `${p.bucket} (${p.region})`}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => startEdit(p)}
                                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => p._id && handleDelete(p._id)}
                                    className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {providers.length === 0 && (
                        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-900/50">
                            <p className="text-zinc-500 dark:text-zinc-400">No storage configured.</p>
                            <button onClick={startNew} className="mt-4 text-sm font-medium text-cyan-600 hover:underline">
                                Configure Storage
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
