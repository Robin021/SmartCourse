"use client";

import { useState, useEffect, useRef } from "react";
import {
    Upload,
    FileText,
    Trash2,
    Loader2,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Zap,
    Clock,
    Database,
} from "lucide-react";

interface Document {
    _id: string;
    original_name: string;
    size: number;
    status: "pending" | "processing" | "processed" | "error";
    chunk_count: number;
    createdAt: string;
    stage_ids?: string[];
}

const STAGES = ["Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8","Q9","Q10"];

export default function KnowledgeBasePage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedStages, setSelectedStages] = useState<string[]>([]);

    const fetchDocuments = async () => {
        try {
            const res = await fetch("/api/admin/kb/list");
            const data = await res.json();
            if (data.success) {
                setDocuments(data.documents);
            }
        } catch (error) {
            console.error("Failed to load documents", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError("");
        setSuccessMessage("");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("stage_ids", JSON.stringify(selectedStages));

        try {
            const res = await fetch("/api/admin/kb/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Upload failed");

            setSuccessMessage(`Uploaded "${file.name}" successfully`);
            await fetchDocuments();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setSelectedStages([]);
        }
    };

    const handleProcess = async (docId: string) => {
        setProcessingIds((prev) => new Set(prev).add(docId));
        setError("");

        try {
            const res = await fetch("/api/admin/kb/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ document_id: docId }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Processing failed");

            setSuccessMessage(`Document processed: ${data.chunkCount} chunks created`);
            await fetchDocuments();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setProcessingIds((prev) => {
                const next = new Set(prev);
                next.delete(docId);
                return next;
            });
        }
    };

    const handleProcessAll = async () => {
        setError("");
        setSuccessMessage("");

        try {
            const res = await fetch("/api/admin/kb/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ process_all: true }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Processing failed");

            setSuccessMessage(data.message);
            await fetchDocuments();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleDelete = async (docId: string, docName: string) => {
        if (!confirm(`Delete "${docName}"? This will also remove all associated chunks.`)) return;

        setError("");
        try {
            const res = await fetch(`/api/admin/kb/delete?id=${docId}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Delete failed");

            setSuccessMessage("Document deleted successfully");
            await fetchDocuments();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "processed":
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Processed
                    </span>
                );
            case "processing":
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing
                    </span>
                );
            case "error":
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-500/20 dark:text-red-400">
                        <AlertCircle className="h-3 w-3" />
                        Error
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400">
                        <Clock className="h-3 w-3" />
                        Pending
                    </span>
                );
        }
    };

    const pendingCount = documents.filter((d) => d.status === "pending").length;

    return (
        <div className="mx-auto max-w-5xl">
            <div className="mb-8 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            Knowledge Base
                        </h1>
                        <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                            Upload and process documents for RAG retrieval. 勾选适用阶段后，生成时会按阶段过滤检索。
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {pendingCount > 0 && (
                            <button
                                onClick={handleProcessAll}
                                className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                            >
                                <Zap className="h-4 w-4" />
                                Process All ({pendingCount})
                            </button>
                        )}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            className="hidden"
                            accept=".pdf,.txt,.md,.docx"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {isUploading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="h-4 w-4" />
                            )}
                            Upload Document
                        </button>
                    </div>
                </div>

                <div className="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/60 dark:bg-indigo-900/10">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-sm font-medium text-indigo-800 dark:text-indigo-200">适用阶段</div>
                        <button
                            onClick={() =>
                                setSelectedStages((prev) =>
                                    prev.length === STAGES.length ? [] : [...STAGES]
                                )
                            }
                            className="text-xs text-indigo-600 hover:underline"
                        >
                            {selectedStages.length === STAGES.length ? "清空" : "全选"}
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {STAGES.map((stage) => {
                            const checked = selectedStages.includes(stage);
                            return (
                                <label key={stage} className="flex items-center gap-2 text-sm text-indigo-900 dark:text-indigo-100">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                                        checked={checked}
                                        onChange={(e) => {
                                            setSelectedStages((prev) =>
                                                e.target.checked
                                                    ? Array.from(new Set([...prev, stage]))
                                                    : prev.filter((s) => s !== stage)
                                            );
                                        }}
                                    />
                                    {stage}
                                </label>
                            );
                        })}
                    </div>
                    <p className="mt-2 text-xs text-indigo-700/80 dark:text-indigo-200/80">
                        不勾选则默认适用于所有阶段；生成时会优先使用当前阶段的文档。
                    </p>
                </div>
            </div>

            {error && (
                <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    {successMessage}
                </div>
            )}

            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {isLoading ? (
                    <div className="flex h-32 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                            <FileText className="h-6 w-6 text-zinc-400" />
                        </div>
                        <h3 className="mt-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            No documents yet
                        </h3>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Upload a PDF, Word, or text file to get started.
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-400">
                            <tr>
                                <th className="px-6 py-3 font-medium">Name</th>
                                <th className="px-6 py-3 font-medium">Size</th>
                                <th className="px-6 py-3 font-medium">Status</th>
                                <th className="px-6 py-3 font-medium">Stages</th>
                                <th className="px-6 py-3 font-medium">Chunks</th>
                                <th className="px-6 py-3 font-medium">Uploaded</th>
                                <th className="px-6 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {documents.map((doc) => (
                                <tr
                                    key={doc._id}
                                    className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                                >
                                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">
                                        <div className="flex items-center gap-3">
                                            <FileText className="h-4 w-4 text-zinc-400" />
                                            <span className="max-w-xs truncate">
                                                {doc.original_name}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                                        {formatSize(doc.size)}
                                    </td>
                                    <td className="px-6 py-4">{getStatusBadge(doc.status)}</td>
                                    <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                                        {doc.stage_ids && doc.stage_ids.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {doc.stage_ids.map((s) => (
                                                    <span
                                                        key={s}
                                                        className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                                                    >
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-zinc-400">All</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {doc.chunk_count > 0 ? (
                                            <span className="inline-flex items-center gap-1 text-zinc-600 dark:text-zinc-300">
                                                <Database className="h-3 w-3" />
                                                {doc.chunk_count}
                                            </span>
                                        ) : (
                                            <span className="text-zinc-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                                        {new Date(doc.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {(doc.status === "pending" || doc.status === "error") && (
                                                <button
                                                    onClick={() => handleProcess(doc._id)}
                                                    disabled={processingIds.has(doc._id)}
                                                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                                    title="Process document"
                                                >
                                                    {processingIds.has(doc._id) ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-3 w-3" />
                                                    )}
                                                    Process
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(doc._id, doc.original_name)}
                                                className="rounded-lg p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                                                title="Delete document"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Info Card */}
            <div className="mt-6 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    How it works
                </h4>
                <ol className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <li>1. Upload documents (PDF, Word, TXT, Markdown)</li>
                    <li>2. Click "Process" to extract text and generate embeddings</li>
                    <li>3. Documents are searchable in project stage RAG</li>
                </ol>
                <p className="mt-2 text-xs text-zinc-400">
                    Requires an active Embedding provider in{" "}
                    <a href="/admin/settings/llm" className="text-indigo-500 hover:underline">
                        LLM Settings
                    </a>
                </p>
            </div>
        </div>
    );
}
