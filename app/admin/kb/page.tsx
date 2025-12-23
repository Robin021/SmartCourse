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
  Activity,
  Settings,
  X,
  Check,
  RotateCcw,
} from "lucide-react";

interface Document {
  _id: string;
  original_name: string;
  size: number;
  status: "pending" | "processing" | "processed" | "error";
  chunk_count: number;
  createdAt: string;
  stage_ids?: string[];
  // 新增字段
  error_message?: string;
  last_processed_at?: string;
  processing_attempts?: number;
}

interface HealthInfo {
  overall: string;
  totalDocuments: number;
  healthyDocuments: number;
  mismatchedDocuments: number;
  orphanChunkSets: number;
}

const STAGES = ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10"];

export default function KnowledgeBasePage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  // 新增状态
  const [healthInfo, setHealthInfo] = useState<HealthInfo | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [editingStagesDocId, setEditingStagesDocId] = useState<string | null>(
    null
  );
  const [editingStagesValue, setEditingStagesValue] = useState<string[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

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

  // 健康检查
  const handleHealthCheck = async () => {
    setIsCheckingHealth(true);
    setError("");
    try {
      const res = await fetch("/api/admin/kb/health");
      const data = await res.json();
      if (data.success) {
        setHealthInfo(data.health);
        if (data.health.overall === "healthy") {
          setSuccessMessage("健康检查通过 ✓");
        } else {
          setError(
            `发现问题: ${data.health.mismatchedDocuments} 个文档数据不一致, ${data.health.orphanChunkSets} 组孤儿数据`
          );
        }
      }
    } catch (err: any) {
      setError("健康检查失败: " + err.message);
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // 重试所有失败的文档
  const handleRetryAll = async () => {
    setIsRetrying(true);
    setError("");
    try {
      const res = await fetch("/api/admin/kb/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage(data.message);
        await fetchDocuments();
      } else {
        setError(data.error || data.message);
      }
    } catch (err: any) {
      setError("重试失败: " + err.message);
    } finally {
      setIsRetrying(false);
    }
  };

  // 更新文档的 stage_ids
  const handleUpdateStages = async (docId: string) => {
    setError("");
    try {
      const res = await fetch("/api/admin/kb/update-stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: docId,
          stage_ids: editingStagesValue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMessage(`已更新阶段关联 (${data.updatedChunks} 个分块已同步)`);
      setEditingStagesDocId(null);
      await fetchDocuments();
    } catch (err: any) {
      setError("更新失败: " + err.message);
    }
  };

  // 开始编辑 stage_ids
  const startEditStages = (doc: Document) => {
    setEditingStagesDocId(doc._id);
    setEditingStagesValue(doc.stage_ids || []);
  };

  // 取消编辑
  const cancelEditStages = () => {
    setEditingStagesDocId(null);
    setEditingStagesValue([]);
  };

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

      setSuccessMessage(
        `Document processed: ${data.chunkCount} chunks created`
      );
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
    if (
      !confirm(
        `Delete "${docName}"? This will also remove all associated chunks.`
      )
    )
      return;

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
              Upload and process documents for RAG retrieval.
              勾选适用阶段后，生成时会按阶段过滤检索。
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* 健康检查按钮 */}
            <button
              onClick={handleHealthCheck}
              disabled={isCheckingHealth}
              className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              title="检查数据一致性"
            >
              {isCheckingHealth ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              健康检查
            </button>
            {/* 重试失败按钮 */}
            {documents.some((d) => d.status === "error") && (
              <button
                onClick={handleRetryAll}
                disabled={isRetrying}
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
              >
                {isRetrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
                重试失败
              </button>
            )}
            {pendingCount > 0 && (
              <button
                onClick={handleProcessAll}
                className="flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-700 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400 dark:hover:bg-cyan-900/50"
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
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
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

        <div className="rounded-lg border border-dashed border-cyan-200 bg-cyan-50/40 p-4 dark:border-cyan-900/60 dark:bg-cyan-900/10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-cyan-800 dark:text-cyan-200">
              适用阶段
            </div>
            <button
              onClick={() =>
                setSelectedStages((prev) =>
                  prev.length === STAGES.length ? [] : [...STAGES]
                )
              }
              className="text-xs text-cyan-600 hover:underline"
            >
              {selectedStages.length === STAGES.length ? "清空" : "全选"}
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {STAGES.map((stage) => {
              const checked = selectedStages.includes(stage);
              return (
                <label
                  key={stage}
                  className="flex items-center gap-2 text-sm text-cyan-900 dark:text-cyan-100"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
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
          <p className="mt-2 text-xs text-cyan-700/80 dark:text-cyan-200/80">
            不勾选则默认适用于所有阶段；生成时会优先使用当前阶段的文档。
          </p>
        </div>
      </div>

      {/* 健康检查结果 */}
      {healthInfo && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            healthInfo.overall === "healthy"
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-900/20"
              : "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-900/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity
                className={`h-4 w-4 ${
                  healthInfo.overall === "healthy"
                    ? "text-emerald-600"
                    : "text-amber-600"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  healthInfo.overall === "healthy"
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {healthInfo.overall === "healthy"
                  ? "数据一致性检查通过"
                  : "发现数据一致性问题"}
              </span>
            </div>
            <button
              onClick={() => setHealthInfo(null)}
              className="text-zinc-400 hover:text-zinc-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-4 text-xs">
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">总文档</div>
              <div className="font-medium text-zinc-700 dark:text-zinc-300">
                {healthInfo.totalDocuments}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">健康</div>
              <div className="font-medium text-emerald-600">
                {healthInfo.healthyDocuments}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">不一致</div>
              <div className="font-medium text-amber-600">
                {healthInfo.mismatchedDocuments}
              </div>
            </div>
            <div>
              <div className="text-zinc-500 dark:text-zinc-400">孤儿数据</div>
              <div className="font-medium text-red-600">
                {healthInfo.orphanChunkSets}
              </div>
            </div>
          </div>
        </div>
      )}

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
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(doc.status)}
                      {doc.status === "error" && doc.error_message && (
                        <span
                          className="text-xs text-red-500 dark:text-red-400 max-w-xs truncate"
                          title={doc.error_message}
                        >
                          {doc.error_message.slice(0, 50)}...
                        </span>
                      )}
                      {doc.processing_attempts &&
                        doc.processing_attempts > 1 && (
                          <span className="text-xs text-zinc-400">
                            尝试 {doc.processing_attempts} 次
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                    {editingStagesDocId === doc._id ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-1">
                          {STAGES.map((stage) => (
                            <label
                              key={stage}
                              className="flex items-center gap-1 text-xs"
                            >
                              <input
                                type="checkbox"
                                className="h-3 w-3 rounded"
                                checked={editingStagesValue.includes(stage)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditingStagesValue([
                                      ...editingStagesValue,
                                      stage,
                                    ]);
                                  } else {
                                    setEditingStagesValue(
                                      editingStagesValue.filter(
                                        (s) => s !== stage
                                      )
                                    );
                                  }
                                }}
                              />
                              {stage}
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleUpdateStages(doc._id)}
                            className="rounded bg-cyan-600 px-2 py-0.5 text-xs text-white hover:bg-cyan-700"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                          <button
                            onClick={cancelEditStages}
                            className="rounded bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="flex flex-wrap gap-1 cursor-pointer hover:opacity-80"
                        onClick={() => startEditStages(doc)}
                        title="点击编辑阶段关联"
                      >
                        {doc.stage_ids && doc.stage_ids.length > 0 ? (
                          doc.stage_ids.map((s) => (
                            <span
                              key={s}
                              className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-zinc-400">
                            All (点击编辑)
                          </span>
                        )}
                      </div>
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
                          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-cyan-600 hover:bg-cyan-50 disabled:opacity-50 dark:text-cyan-400 dark:hover:bg-cyan-900/20"
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
          使用说明
        </h4>
        <ol className="space-y-1 text-xs text-zinc-500 dark:text-zinc-400">
          <li>1. 上传文档 (支持 PDF, Word, TXT, Markdown)</li>
          <li>2. 点击 "Process" 提取文本并生成向量索引</li>
          <li>3. 文档将可用于项目阶段的 RAG 检索</li>
          <li>4. 点击阶段标签可修改文档的阶段关联（无需重新处理）</li>
          <li>5. 使用 "健康检查" 验证数据一致性</li>
        </ol>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
            ✓ 智能分块（按段落/语义）
          </span>
          <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            ✓ 自动重试机制
          </span>
          <span className="rounded bg-sky-100 px-2 py-0.5 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
            ✓ 并发控制
          </span>
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          需要在{" "}
          <a
            href="/admin/settings/llm"
            className="text-cyan-500 hover:underline"
          >
            LLM 设置
          </a>{" "}
          中配置 Embedding 服务
        </p>
      </div>
    </div>
  );
}
