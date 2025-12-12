"use client";

import { useState, useEffect } from "react";
import {
  Save,
  Loader2,
  CheckCircle2,
  Plus,
  Trash2,
  Edit2,
  MoreVertical,
  Bot,
  Database,
} from "lucide-react";

interface LLMProvider {
  _id?: string;
  name: string;
  provider: string;
  type: "chat" | "embedding";
  base_url: string;
  api_key: string;
  model: string;
  is_active: boolean;
  max_output_tokens?: number;
}

export default function LLMSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<LLMProvider[]>([]);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<LLMProvider>({
    name: "",
    provider: "other",
    type: "chat",
    base_url: "",
    api_key: "",
    model: "",
    is_active: false,
    max_output_tokens: 2000,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [testing, setTesting] = useState<
    Record<
      string,
      { status: "idle" | "loading" | "ok" | "error"; message?: string }
    >
  >({});

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/llm");
      const data = await res.json();
      if (data.success) {
        const normalized = (data.config.llm_providers || []).map((p: any) => {
          const parsed = Number(p.max_output_tokens);
          const maxTokens =
            Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
          return { ...p, max_output_tokens: maxTokens };
        });
        setProviders(normalized);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage("");

    try {
      const res = await fetch("/api/admin/config/llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: currentProvider }),
      });

      if (!res.ok) throw new Error("Failed to save");

      setSuccessMessage("Saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);

      // Refresh list and close form
      await fetchConfig();
      setIsEditing(false);
      resetForm();
    } catch (error) {
      console.error("Save error", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this provider?")) return;

    try {
      const res = await fetch(`/api/admin/config/llm?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      await fetchConfig();
    } catch (error) {
      console.error("Delete error", error);
    }
  };

  const resetForm = () => {
    setCurrentProvider({
      name: "",
      provider: "other",
      type: "chat",
      base_url: "",
      api_key: "",
      model: "",
      is_active: false,
      max_output_tokens: 2000,
    });
  };

  const startEdit = (provider: LLMProvider) => {
    setCurrentProvider({
      ...provider,
      max_output_tokens:
        Number.isFinite(Number(provider.max_output_tokens)) &&
        Number(provider.max_output_tokens) > 0
          ? Number(provider.max_output_tokens)
          : 2000,
    });
    setIsEditing(true);
  };

  const startNew = () => {
    resetForm();
    setIsEditing(true);
  };

  const handleTest = async (p: LLMProvider) => {
    setTesting((prev) => ({
      ...prev,
      [p._id || p.name]: { status: "loading" },
    }));
    try {
      const res = await fetch("/api/admin/config/llm/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: p.base_url,
          api_key: p.api_key,
          model: p.model,
          type: p.type,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Test failed");
      }
      setTesting((prev) => ({
        ...prev,
        [p._id || p.name]: {
          status: "ok",
          message: `OK ${data.latency_ms ? `(${data.latency_ms}ms)` : ""}`,
        },
      }));
    } catch (error: any) {
      setTesting((prev) => ({
        ...prev,
        [p._id || p.name]: {
          status: "error",
          message: error.message || "Test failed",
        },
      }));
    }
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
            LLM Configuration
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Manage your AI model providers (Chat & Embeddings).
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={startNew}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
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
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={currentProvider.name}
                  onChange={(e) =>
                    setCurrentProvider({
                      ...currentProvider,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="e.g. DeepSeek Chat"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Type
                </label>
                <select
                  value={currentProvider.type}
                  onChange={(e) =>
                    setCurrentProvider({
                      ...currentProvider,
                      type: e.target.value as any,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="chat">Chat (LLM)</option>
                  <option value="embedding">Embedding</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Model ID
                </label>
                <input
                  type="text"
                  required
                  value={currentProvider.model}
                  onChange={(e) =>
                    setCurrentProvider({
                      ...currentProvider,
                      model: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="e.g. deepseek-chat"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Base URL
                </label>
                <input
                  type="text"
                  required
                  value={currentProvider.base_url}
                  onChange={(e) =>
                    setCurrentProvider({
                      ...currentProvider,
                      base_url: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="https://api.deepseek.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  min={1}
                  value={currentProvider.max_output_tokens ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const parsed = Number(val);
                    setCurrentProvider({
                      ...currentProvider,
                      max_output_tokens:
                        val === "" || !Number.isFinite(parsed) || parsed <= 0
                          ? undefined
                          : parsed,
                    });
                  }}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                  placeholder="e.g. 4096"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  用于生成课程陈述建议设置 8000+，默认 2000 可能导致内容截断。
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                API Key
              </label>
              <input
                type="password"
                required
                value={currentProvider.api_key}
                onChange={(e) =>
                  setCurrentProvider({
                    ...currentProvider,
                    api_key: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="sk-..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={currentProvider.is_active}
                onChange={(e) =>
                  setCurrentProvider({
                    ...currentProvider,
                    is_active: e.target.checked,
                  })
                }
                className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label
                htmlFor="isActive"
                className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
              >
                Set as Active Provider (for this type)
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              {successMessage && (
                <span className="text-sm text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> {successMessage}
                </span>
              )}
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
              className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-500/50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${
                    p.type === "chat"
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10"
                      : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10"
                  }`}
                >
                  {p.type === "chat" ? (
                    <Bot className="h-5 w-5" />
                  ) : (
                    <Database className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {p.name}
                    </h3>
                    {p.is_active && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {p.model} • {p.base_url}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Max output tokens: {p.max_output_tokens ?? 2000}
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
                  onClick={() => handleTest(p)}
                  className="rounded-lg px-3 py-2 text-xs font-medium border border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
                >
                  {testing[p._id || p.name]?.status === "loading"
                    ? "Testing..."
                    : testing[p._id || p.name]?.status === "ok"
                    ? testing[p._id || p.name]?.message || "OK"
                    : "Test"}
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
              <p className="text-zinc-500 dark:text-zinc-400">
                No providers configured yet.
              </p>
              <button
                onClick={startNew}
                className="mt-4 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                Add your first provider
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
