"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, CheckCircle2, Globe } from "lucide-react";

interface WebSearchConfig {
  enabled: boolean;
  serper_api_key: string;
  firecrawl_api_key: string;
  jina_api_key: string;
  max_k: number;
  language: string;
  region: string;
  use_firecrawl: boolean;
  use_jina: boolean;
}

const DEFAULT_CONFIG: WebSearchConfig = {
  enabled: false,
  serper_api_key: "",
  firecrawl_api_key: "",
  jina_api_key: "",
  max_k: 5,
  language: "zh-CN",
  region: "",
  use_firecrawl: true,
  use_jina: true,
};

export default function WebSearchSettingsPage() {
  const [config, setConfig] = useState<WebSearchConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResults, setTestResults] = useState<
    Record<
      string,
      { status: "ok" | "error" | "missing" | "skipped" | "loading"; message: string }
    >
  >({});
  const [testError, setTestError] = useState("");

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/web-search");
      const data = await res.json();
      if (data.success && data.web_search) {
        setConfig({ ...DEFAULT_CONFIG, ...data.web_search });
      }
    } catch (error) {
      console.error("Failed to load web search config", error);
    } finally {
      setIsLoading(false);
      setIsLoaded(true);
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
      const res = await fetch("/api/admin/config/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ web_search: config }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      if (data.success && data.web_search) {
        setConfig({ ...DEFAULT_CONFIG, ...data.web_search });
      }

      setSuccessMessage("Saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Save error", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnections = async () => {
    setIsTesting(true);
    setTestError("");
    setTestResults({
      serper: { status: "loading", message: "Testing..." },
      firecrawl: { status: "loading", message: "Testing..." },
      jina: { status: "loading", message: "Testing..." },
    });

    try {
      const res = await fetch("/api/admin/config/web-search/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ web_search: config }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Test failed");
      }
      setTestResults(data.results || {});
    } catch (error: any) {
      console.error("Test error", error);
      setTestError(error.message || "Test failed");
    } finally {
      setIsTesting(false);
    }
  };

  const renderStatus = (
    label: string,
    result?: { status: string; message: string }
  ) => {
    if (!result) {
      return (
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
          {label}: idle
        </span>
      );
    }

    const colorMap: Record<string, string> = {
      ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      error: "bg-red-50 text-red-700 ring-red-200",
      missing: "bg-amber-50 text-amber-700 ring-amber-200",
      skipped: "bg-slate-100 text-slate-600 ring-slate-200",
      loading: "bg-slate-100 text-slate-500 ring-slate-200",
    };
    const cls = colorMap[result.status] || colorMap.loading;
    const text = result.message || result.status;

    return (
      <span className={`rounded-full px-3 py-1 text-xs ring-1 ${cls}`}>
        {label}: {text}
      </span>
    );
  };

  if (!isLoaded && isLoading) {
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
            Web Search Configuration
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            Manage API keys and defaults for public web search.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
          <Globe className="h-4 w-4" />
          Serper + Firecrawl + Jina
        </div>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Settings
          </h2>
          {successMessage ? (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              {successMessage}
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                General
              </h3>
              <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-900"
                />
                Enable web search
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <label className="text-sm text-zinc-600 dark:text-zinc-300">
                Max results
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={config.max_k}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      max_k: Number(e.target.value),
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="text-sm text-zinc-600 dark:text-zinc-300">
                Language
                <input
                  type="text"
                  value={config.language}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, language: e.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="text-sm text-zinc-600 dark:text-zinc-300">
                Region
                <input
                  type="text"
                  value={config.region}
                  onChange={(e) =>
                    setConfig((prev) => ({ ...prev, region: e.target.value }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              API Keys
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Leave ******** to keep existing keys. Clear the field to remove a key.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm text-zinc-600 dark:text-zinc-300">
                Serper API Key
                <input
                  type="password"
                  value={config.serper_api_key}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      serper_api_key: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="text-sm text-zinc-600 dark:text-zinc-300">
                Firecrawl API Key
                <input
                  type="password"
                  value={config.firecrawl_api_key}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      firecrawl_api_key: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
              <label className="text-sm text-zinc-600 dark:text-zinc-300">
                Jina API Key
                <input
                  type="password"
                  value={config.jina_api_key}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      jina_api_key: e.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnections}
                disabled={isTesting}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:border-cyan-200 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-cyan-500/50"
              >
                {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Test connections
              </button>
              {renderStatus("Serper", testResults.serper)}
              {renderStatus("Firecrawl", testResults.firecrawl)}
              {renderStatus("Jina", testResults.jina)}
            </div>
            {testError ? (
              <div className="mt-2 text-xs text-red-600">{testError}</div>
            ) : null}
          </div>

          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
              Extraction
            </h3>
            <div className="mt-3 flex flex-wrap gap-6 text-sm text-zinc-600 dark:text-zinc-300">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.use_firecrawl}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      use_firecrawl: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-900"
                />
                Use Firecrawl (primary)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.use_jina}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      use_jina: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-zinc-300 text-cyan-600 focus:ring-cyan-200 dark:border-zinc-700 dark:bg-zinc-900"
                />
                Use Jina (fallback)
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
