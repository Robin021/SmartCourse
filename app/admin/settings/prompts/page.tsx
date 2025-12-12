"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  FileText,
  X,
  Lock,
  History,
  FlaskConical,
  RotateCcw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface PromptVersion {
  _id: string;
  version: number;
  template: string;
  variables: string[];
  created_by: string;
  change_note: string;
  createdAt: string;
}

interface ABTestVersion {
  version: number;
  weight: number;
}

interface PromptTemplate {
  _id?: string;
  name: string;
  key: string;
  template: string;
  variables: string[];
  description: string;
  is_system: boolean;
  current_version?: number;
  ab_testing?: {
    enabled: boolean;
    versions: ABTestVersion[];
  };
}

export default function PromptSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<PromptTemplate>({
    name: "",
    key: "",
    template: "",
    variables: [],
    description: "",
    is_system: false,
  });

  // Version History State
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [deletingVersion, setDeletingVersion] = useState<number | null>(null);
  const [showCleanup, setShowCleanup] = useState<string | null>(null);
  const [keepCount, setKeepCount] = useState(10);

  // A/B Testing State
  const [showABTest, setShowABTest] = useState<string | null>(null);
  const [abConfig, setAbConfig] = useState<{
    enabled: boolean;
    versions: ABTestVersion[];
  }>({ enabled: false, versions: [] });
  const [savingAB, setSavingAB] = useState(false);

  const fetchPrompts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/prompts");
      const data = await res.json();
      if (data.success) {
        setPrompts(data.prompts || []);
      }
    } catch (error) {
      console.error("Failed to load prompts", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentPrompt),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save");
        return;
      }

      await fetchPrompts();
      setIsEditing(false);
    } catch (error) {
      console.error("Save error", error);
      alert("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this prompt?")) return;
    try {
      const res = await fetch(`/api/admin/prompts?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete");
        return;
      }
      fetchPrompts();
    } catch (e) {
      console.error(e);
    }
  };

  const startNew = () => {
    setCurrentPrompt({
      name: "",
      key: "",
      template: "",
      variables: [],
      description: "",
      is_system: false,
    });
    setIsEditing(true);
  };

  const startEdit = (p: PromptTemplate) => {
    setCurrentPrompt(p);
    setIsEditing(true);
  };

  // Version History Functions
  const fetchVersions = async (promptId: string) => {
    setLoadingVersions(true);
    try {
      const res = await fetch(
        `/api/admin/prompts?action=versions&prompt_id=${promptId}`
      );
      const data = await res.json();
      if (data.success) {
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error("Failed to load versions", error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const toggleHistory = async (promptId: string) => {
    if (showHistory === promptId) {
      setShowHistory(null);
      setVersions([]);
    } else {
      setShowHistory(promptId);
      setShowABTest(null);
      await fetchVersions(promptId);
    }
  };

  const handleRollback = async (promptId: string, version: number) => {
    if (
      !confirm(
        `Rollback to version ${version}? This will create a new version.`
      )
    )
      return;

    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rollback",
          prompt_id: promptId,
          version,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to rollback");
        return;
      }

      alert(data.message);
      await fetchPrompts();
      await fetchVersions(promptId);
    } catch (error) {
      console.error("Rollback error", error);
    }
  };

  const handleDeleteVersion = async (promptId: string, version: number) => {
    if (!confirm(`确定要删除版本 v${version} 吗？此操作不可恢复。`)) {
      return;
    }
    setDeletingVersion(version);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteVersion",
          prompt_id: promptId,
          version,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete version");
        return;
      }
      await fetchVersions(promptId);
    } catch (error) {
      console.error("Delete version error", error);
    } finally {
      setDeletingVersion(null);
    }
  };

  const handleCleanupVersions = async (promptId: string) => {
    if (
      !confirm(
        `确定要清理旧版本吗？将只保留最新的 ${keepCount} 个版本，其他版本将被永久删除。`
      )
    ) {
      return;
    }
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cleanupVersions",
          prompt_id: promptId,
          keepCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to cleanup versions");
        return;
      }
      alert(data.message || `已清理 ${data.deletedCount || 0} 个旧版本`);
      await fetchVersions(promptId);
      setShowCleanup(null);
    } catch (error) {
      console.error("Cleanup versions error", error);
    }
  };

  // A/B Testing Functions
  const toggleABTest = (prompt: PromptTemplate) => {
    if (showABTest === prompt._id) {
      setShowABTest(null);
    } else {
      setShowABTest(prompt._id || null);
      setShowHistory(null);
      // Initialize AB config from prompt
      setAbConfig({
        enabled: prompt.ab_testing?.enabled || false,
        versions: prompt.ab_testing?.versions || [],
      });
    }
  };

  const addVersionToAB = (version: number) => {
    if (abConfig.versions.find((v) => v.version === version)) return;
    setAbConfig((prev) => ({
      ...prev,
      versions: [...prev.versions, { version, weight: 50 }],
    }));
  };

  const removeVersionFromAB = (version: number) => {
    setAbConfig((prev) => ({
      ...prev,
      versions: prev.versions.filter((v) => v.version !== version),
    }));
  };

  const updateVersionWeight = (version: number, weight: number) => {
    setAbConfig((prev) => ({
      ...prev,
      versions: prev.versions.map((v) =>
        v.version === version
          ? { ...v, weight: Math.max(0, Math.min(100, weight)) }
          : v
      ),
    }));
  };

  const saveABConfig = async (promptId: string) => {
    setSavingAB(true);
    try {
      const res = await fetch("/api/admin/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ab_test",
          prompt_id: promptId,
          ab_testing: abConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save A/B test config");
        return;
      }

      alert("A/B test configuration saved!");
      await fetchPrompts();
    } catch (error) {
      console.error("Save A/B error", error);
    } finally {
      setSavingAB(false);
    }
  };

  // Extract variables for preview
  const extractedVariables = (
    currentPrompt.template?.match(/\{\{(\w+)\}\}/g) || []
  ).map((v) => v.replace(/\{\{|\}\}/g, ""));

  if (isLoading && !prompts.length && !isEditing) {
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
            Prompt Templates
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Manage AI system prompts with versioning and A/B testing.
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={startNew}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Prompt
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {currentPrompt._id ? "Edit Prompt" : "New Prompt"}
            </h2>
            <button
              onClick={() => setIsEditing(false)}
              className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={currentPrompt.name}
                  onChange={(e) =>
                    setCurrentPrompt((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="RAG Answer Prompt"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Key
                </label>
                <input
                  type="text"
                  required
                  disabled={currentPrompt.is_system}
                  value={currentPrompt.key}
                  onChange={(e) =>
                    setCurrentPrompt((prev) => ({
                      ...prev,
                      key: e.target.value.replace(/\s/g, "_").toLowerCase(),
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="rag_answer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Description
              </label>
              <input
                type="text"
                value={currentPrompt.description}
                onChange={(e) =>
                  setCurrentPrompt((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="Prompt for generating RAG answers"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Template
              </label>
              <textarea
                required
                rows={10}
                value={currentPrompt.template}
                onChange={(e) =>
                  setCurrentPrompt((prev) => ({
                    ...prev,
                    template: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="You are a helpful assistant. Use the following context to answer:&#10;&#10;{{context}}&#10;&#10;User Question: {{query}}"
              />
              <p className="text-xs text-zinc-500">
                Use{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
                  {"{{variable}}"}
                </code>{" "}
                syntax for dynamic content.
              </p>
            </div>

            {extractedVariables.length > 0 && (
              <div className="rounded-lg border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                <p className="mb-2 text-xs font-medium uppercase text-zinc-500">
                  Detected Variables
                </p>
                <div className="flex flex-wrap gap-2">
                  {extractedVariables.map((v) => (
                    <span
                      key={v}
                      className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Prompt
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          {prompts.map((p) => (
            <div
              key={p._id}
              className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            >
              {/* Prompt Card Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100/50 dark:bg-zinc-800/50">
                    <FileText className="h-5 w-5 text-zinc-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {p.name}
                      </h3>
                      <code className="rounded border border-zinc-200 px-1.5 py-0.5 text-xs text-zinc-500 dark:border-zinc-700">
                        {p.key}
                      </code>
                      {p.is_system && (
                        <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                          <Lock className="h-3 w-3" /> System
                        </span>
                      )}
                      {p.ab_testing?.enabled && (
                        <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-500/20 dark:text-purple-400">
                          <FlaskConical className="h-3 w-3" /> A/B Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                        v{p.current_version || 1}
                      </span>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {p.description ||
                          `${p.variables.length} variable${
                            p.variables.length !== 1 ? "s" : ""
                          }`}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => p._id && toggleHistory(p._id)}
                    className={`rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      showHistory === p._id
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-400"
                    }`}
                    title="Version History"
                  >
                    <History className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => toggleABTest(p)}
                    className={`rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      showABTest === p._id
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-400"
                    }`}
                    title="A/B Testing"
                  >
                    <FlaskConical className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => startEdit(p)}
                    className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {!p.is_system && (
                    <button
                      onClick={() => p._id && handleDelete(p._id)}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Version History Panel */}
              {showHistory === p._id && (
                <div className="border-t border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      版本历史
                    </h4>
                    <div className="flex items-center gap-2">
                      {versions.length > 10 && (
                        <button
                          onClick={() =>
                            setShowCleanup(
                              showCleanup === p._id ? null : p._id || null
                            )
                          }
                          className="text-xs text-orange-600 hover:underline"
                        >
                          清理旧版本
                        </button>
                      )}
                    </div>
                  </div>

                  {showCleanup === p._id && (
                    <div className="mb-3 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-orange-800 dark:text-orange-200">
                          清理旧版本
                        </span>
                        <button
                          onClick={() => setShowCleanup(null)}
                          className="text-orange-600 hover:text-orange-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={keepCount}
                          onChange={(e) => setKeepCount(Number(e.target.value))}
                          className="text-xs rounded border border-orange-300 px-2 py-1 bg-white dark:bg-zinc-800"
                        >
                          <option value="5">5 个</option>
                          <option value="10">10 个</option>
                          <option value="20">20 个</option>
                          <option value="50">50 个</option>
                        </select>
                        <button
                          onClick={() => p._id && handleCleanupVersions(p._id)}
                          className="inline-flex items-center gap-1 rounded bg-orange-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          执行清理
                        </button>
                      </div>
                    </div>
                  )}
                  {loadingVersions ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                    </div>
                  ) : versions.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      No version history available.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((v) => (
                        <div
                          key={v._id}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
                        >
                          <div className="flex items-center gap-3">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                              v{v.version}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {v.change_note || "No change note"}
                              </p>
                              <p className="text-xs text-zinc-500">
                                {v.created_by} •{" "}
                                {new Date(v.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {v.version !== p.current_version && (
                              <>
                                <button
                                  onClick={() =>
                                    p._id && handleRollback(p._id, v.version)
                                  }
                                  disabled={deletingVersion !== null}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-500/10 disabled:opacity-50"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  回滚
                                </button>
                                <button
                                  onClick={() =>
                                    p._id &&
                                    handleDeleteVersion(p._id, v.version)
                                  }
                                  disabled={deletingVersion !== null}
                                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 disabled:opacity-50"
                                >
                                  {deletingVersion === v.version ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3 w-3" />
                                  )}
                                </button>
                              </>
                            )}
                            {v.version === p.current_version && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-500/20 dark:text-green-400">
                                当前
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* A/B Testing Panel */}
              {showABTest === p._id && (
                <div className="border-t border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="mb-4 flex items-center justify-between">
                    <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      A/B Testing Configuration
                    </h4>
                    <label className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">
                        Enable A/B Test
                      </span>
                      <button
                        onClick={() =>
                          setAbConfig((prev) => ({
                            ...prev,
                            enabled: !prev.enabled,
                          }))
                        }
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          abConfig.enabled
                            ? "bg-indigo-600"
                            : "bg-zinc-300 dark:bg-zinc-600"
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            abConfig.enabled ? "translate-x-4" : ""
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  {abConfig.enabled && (
                    <>
                      {/* Add Version Selector */}
                      <div className="mb-4">
                        <p className="mb-2 text-xs text-zinc-500">
                          Add versions to test (click to add):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {Array.from(
                            { length: p.current_version || 1 },
                            (_, i) => i + 1
                          ).map((v) => {
                            const inTest = abConfig.versions.some(
                              (ver) => ver.version === v
                            );
                            return (
                              <button
                                key={v}
                                onClick={() =>
                                  inTest
                                    ? removeVersionFromAB(v)
                                    : addVersionToAB(v)
                                }
                                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                  inTest
                                    ? "bg-indigo-600 text-white"
                                    : "border border-zinc-300 text-zinc-500 hover:border-indigo-400 dark:border-zinc-600"
                                }`}
                              >
                                {v}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Weight Sliders */}
                      {abConfig.versions.length > 0 && (
                        <div className="mb-4 space-y-3">
                          <p className="text-xs text-zinc-500">
                            Traffic distribution:
                          </p>
                          {abConfig.versions.map((v) => (
                            <div
                              key={v.version}
                              className="flex items-center gap-3"
                            >
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400">
                                v{v.version}
                              </span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={v.weight}
                                onChange={(e) =>
                                  updateVersionWeight(
                                    v.version,
                                    parseInt(e.target.value)
                                  )
                                }
                                className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-zinc-200 dark:bg-zinc-700"
                              />
                              <span className="w-12 text-right text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                {v.weight}%
                              </span>
                              <button
                                onClick={() => removeVersionFromAB(v.version)}
                                className="text-zinc-400 hover:text-red-500"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          {abConfig.versions.length >= 2 && (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              ⚠️ Weights will be normalized. Total:{" "}
                              {abConfig.versions.reduce(
                                (sum, v) => sum + v.weight,
                                0
                              )}
                              %
                            </p>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => p._id && saveABConfig(p._id)}
                      disabled={savingAB}
                      className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {savingAB ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save A/B Config
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {prompts.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-zinc-500 dark:text-zinc-400">
                No prompts configured.
              </p>
              <button
                onClick={startNew}
                className="mt-4 text-sm font-medium text-indigo-600 hover:underline"
              >
                Create First Prompt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
