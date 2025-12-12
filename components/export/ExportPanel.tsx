"use client";

import { useEffect, useMemo, useState } from "react";

type ExportFormat = "text" | "docx" | "pdf" | "pptx";
const ALL_EXPORT_FORMATS: ExportFormat[] = ["text", "docx", "pdf", "pptx"];

interface TemplateInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  usageScenario: string;
  supportedFormats: ExportFormat[];
}

interface ValidationResult {
  valid: boolean;
  missingFields: Array<{
    key: string;
    label: string;
    stageId?: string;
    stageName?: string;
  }>;
  warnings: string[];
}

interface ExportPanelProps {
  projectId: string;
  stages: Array<{ stage_id: string; name: string; status?: string }>;
}

function parseFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = /filename\*?=([^;]+)/i.exec(disposition);
  if (match?.[1]) {
    const raw = match[1].replace(/(^")|("$)/g, "");
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
}

export function ExportPanel({ projectId, stages }: ExportPanelProps) {
  const [format, setFormat] = useState<ExportFormat>("docx");
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 模板相关状态
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // 加载模板列表
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
          // 默认选择通用模板
          const general = data.templates?.find(
            (t: TemplateInfo) => t.id === "general"
          );
          if (general) {
            setSelectedTemplate(general.id);
          }
        }
      } catch (err) {
        console.error("Failed to load templates:", err);
      } finally {
        setLoadingTemplates(false);
      }
    }
    fetchTemplates();
  }, []);

  // 当选择模板变化时，校验数据
  useEffect(() => {
    if (!selectedTemplate || !projectId) {
      setValidation(null);
      return;
    }

    async function validateTemplate() {
      setIsValidating(true);
      try {
        const res = await fetch("/api/templates/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, templateId: selectedTemplate }),
        });
        if (res.ok) {
          const data = await res.json();
          setValidation(data);
        }
      } catch (err) {
        console.error("Validation failed:", err);
      } finally {
        setIsValidating(false);
      }
    }
    validateTemplate();
  }, [selectedTemplate, projectId]);

  // 当前选中模板的信息
  const currentTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplate),
    [templates, selectedTemplate]
  );

  // 当前模板支持的格式
  const supportedFormats = useMemo(
    () => currentTemplate?.supportedFormats ?? ALL_EXPORT_FORMATS,
    [currentTemplate]
  );

  // 如果当前格式不被支持，切换到第一个支持的格式
  useEffect(() => {
    if (supportedFormats.length > 0 && !supportedFormats.includes(format)) {
      setFormat(supportedFormats[0]);
    }
  }, [supportedFormats, format]);

  const filenameFallback = useMemo(() => {
    const ext = format === "text" ? "txt" : format;
    return `export.${ext}`;
  }, [format]);

  const toggleStage = (stageId: string) => {
    setSelectedStages((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const res = await fetch(`/api/project/${projectId}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          stages: selectedStages.length > 0 ? selectedStages : undefined,
          templateId: selectedTemplate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "导出失败");
      }

      const blob = await res.blob();
      const filename =
        parseFilename(res.headers.get("Content-Disposition")) ||
        filenameFallback;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || "导出失败，请稍后重试");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">导出课程设计</p>
          <p className="text-xs text-muted-foreground">
            选择模板和格式，一键导出专业文档
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {isExporting ? "导出中..." : "导出"}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* 模板选择 */}
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          模板
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            disabled={loadingTemplates}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-foreground shadow-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          >
            {loadingTemplates ? (
              <option value="">加载中...</option>
            ) : (
              <>
                <option value="">不使用模板（原始格式）</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </>
            )}
          </select>
        </label>

        {/* 格式选择 */}
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          格式
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-foreground shadow-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          >
            {supportedFormats.includes("text") && (
              <option value="text">文本 (Markdown)</option>
            )}
            {supportedFormats.includes("docx") && (
              <option value="docx">Word (.docx)</option>
            )}
            {supportedFormats.includes("pdf") && (
              <option value="pdf">PDF (.pdf)</option>
            )}
            {supportedFormats.includes("pptx") && (
              <option value="pptx">PPT (.pptx)</option>
            )}
          </select>
        </label>
      </div>

      {/* 模板描述和适用场景 */}
      {currentTemplate && (
        <div className="mt-3 rounded-lg border border-zinc-100 bg-zinc-50 p-2 dark:border-zinc-800 dark:bg-zinc-900/50">
          <p className="text-xs text-muted-foreground">
            {currentTemplate.description}
          </p>
          <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
            适用场景：{currentTemplate.usageScenario}
          </p>
        </div>
      )}

      {/* 校验结果 */}
      {selectedTemplate && validation && !validation.valid && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 dark:border-amber-800 dark:bg-amber-900/30">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            ⚠️ 部分内容缺失，导出后可能不完整：
          </p>
          <ul className="mt-1 space-y-0.5">
            {validation.missingFields.slice(0, 5).map((field) => (
              <li
                key={field.key}
                className="text-xs text-amber-600 dark:text-amber-400"
              >
                • {field.label}
                {field.stageId && (
                  <span className="text-amber-500">（{field.stageId}）</span>
                )}
              </li>
            ))}
            {validation.missingFields.length > 5 && (
              <li className="text-xs text-amber-500">
                ...还有 {validation.missingFields.length - 5} 项
              </li>
            )}
          </ul>
        </div>
      )}

      {isValidating && (
        <p className="mt-2 text-xs text-muted-foreground">正在校验数据...</p>
      )}

      {/* 阶段选择（仅在未使用模板或通用模板时显示） */}
      {(!selectedTemplate || selectedTemplate === "general") && (
        <div className="mt-3 space-y-1 text-xs font-medium text-muted-foreground">
          <div>阶段（留空则导出全部）</div>
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => {
              const active = selectedStages.includes(stage.stage_id);
              return (
                <button
                  key={stage.stage_id}
                  type="button"
                  onClick={() => toggleStage(stage.stage_id)}
                  className={`rounded-full border px-3 py-1 text-[11px] transition ${
                    active
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/30 dark:text-indigo-200"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-indigo-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  }`}
                >
                  {stage.stage_id} {stage.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default ExportPanel;
