"use client";

import { useEffect, useMemo, useState } from "react";
import { StageHeader } from "@/components/StageHeader";
import { DynamicFormRenderer } from "@/components/DynamicFormRenderer";
import { TiptapEditor } from "@/components/TiptapEditor";
import {
  BookOpen,
  CheckCircle2,
  History,
  Globe,
  MessageSquare,
  Save,
  Sparkles,
  X,
  Quote,
} from "lucide-react";
import { Q1_FORM_SCHEMA } from "@/lib/q1/q1FormConfig";
import { Q2_FORM_SCHEMA } from "@/lib/q2/q2FormConfig";
import { Q3_FORM_SCHEMA } from "@/lib/q3/q3FormConfig";
import { Q4_FORM_SCHEMA, FIVE_VIRTUES } from "@/lib/q4/q4FormConfig";
import { Q5_FORM_SCHEMA } from "@/lib/q5/q5FormConfig";
import { Q6_FORM_SCHEMA } from "@/lib/q6/q6FormConfig";
import { Q7_FORM_SCHEMA } from "@/lib/q7/q7FormConfig";
import { Q8_FORM_SCHEMA } from "@/lib/q8/q8FormConfig";
import { Q9_FORM_SCHEMA } from "@/lib/q9/q9FormConfig";
import { Q10_FORM_SCHEMA } from "@/lib/q10/q10FormConfig";
import VersionHistory from "@/components/version/VersionHistory";
import ChatWindow from "@/components/chat/ChatWindow";
import { useParams } from "next/navigation";
import Link from "next/link";

const STAGE_NAV = [
  { id: "Q1", name: "学校课程情境" },
  { id: "Q2", name: "教育哲学" },
  { id: "Q3", name: "办学理念" },
  { id: "Q4", name: "育人目标" },
  { id: "Q5", name: "课程命名" },
  { id: "Q6", name: "课程理念" },
  { id: "Q7", name: "目标细化" },
  { id: "Q8", name: "结构设计" },
  { id: "Q9", name: "实施方案" },
  { id: "Q10", name: "评价体系" },
];

export default function StagePage() {
  const params = useParams<{ id: string; stageId: string }>();
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const stageId = Array.isArray(params?.stageId)
    ? params.stageId[0]
    : params?.stageId;
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [docContent, setDocContent] = useState("");
  const [selection, setSelection] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [coreConcept, setCoreConcept] = useState<string>("");
  const [nameSuggestion, setNameSuggestion] = useState<string>("");
  const [tagline, setTagline] = useState<string>("");
  const [score, setScore] = useState<number | null>(null);
  const [consistency, setConsistency] = useState<number | null>(null);
  const [gapScore, setGapScore] = useState<number | null>(null);
  const [structureScore, setStructureScore] = useState<number | null>(null);
  const [feasibilityScore, setFeasibilityScore] = useState<number | null>(null);
  const [evaluationScore, setEvaluationScore] = useState<number | null>(null);
  const [coverage, setCoverage] = useState<Record<string, number>>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [ragDocs, setRagDocs] = useState<any[]>([]);
  const [webDocs, setWebDocs] = useState<any[]>([]);
  const [showRag, setShowRag] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isLoadingStage, setIsLoadingStage] = useState(true);
  const [isFormCollapsed, setIsFormCollapsed] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [useWeb, setUseWeb] = useState(false);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [isFilling, setIsFilling] = useState(false);
  const [showFillPanel, setShowFillPanel] = useState(false);
  const [fillSuggestions, setFillSuggestions] = useState<Record<string, any>>(
    {}
  );
  const [fillSelections, setFillSelections] = useState<Record<string, boolean>>(
    {}
  );
  const [fillNotes, setFillNotes] = useState("");
  const [fillError, setFillError] = useState<string | null>(null);
  const [fillOverwrite, setFillOverwrite] = useState(false);

  const combinedReferences = useMemo(
    () => [...ragDocs, ...webDocs],
    [ragDocs, webDocs]
  );

  const schema = useMemo(() => {
    if (stageId === "Q1") return Q1_FORM_SCHEMA;
    if (stageId === "Q2") return Q2_FORM_SCHEMA;
    if (stageId === "Q3") return Q3_FORM_SCHEMA;
    if (stageId === "Q4") return Q4_FORM_SCHEMA;
    if (stageId === "Q5") return Q5_FORM_SCHEMA;
    if (stageId === "Q6") return Q6_FORM_SCHEMA;
    if (stageId === "Q7") return Q7_FORM_SCHEMA;
    if (stageId === "Q8") return Q8_FORM_SCHEMA;
    if (stageId === "Q9") return Q9_FORM_SCHEMA;
    if (stageId === "Q10") return Q10_FORM_SCHEMA;
    return Q1_FORM_SCHEMA;
  }, [stageId]);

  const schemaFields = useMemo(() => {
    const fields: Array<{
      key: string;
      label: string;
      type: string;
      required?: boolean;
      options?: Array<{ value: string; label: string }>;
    }> = [];
    (schema?.sections || []).forEach((section: any) => {
      (section.fields || []).forEach((field: any) => {
        fields.push({
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required,
          options: Array.isArray(field.options)
            ? field.options.map((opt: any) => ({
              value: opt.value ?? opt,
              label: opt.label ?? opt,
            }))
            : undefined,
        });
      });
    });
    return fields;
  }, [schema]);

  const fieldMeta = useMemo(() => {
    const map = new Map<
      string,
      { label: string; type: string; required?: boolean }
    >();
    schemaFields.forEach((field) => {
      map.set(field.key, {
        label: field.label,
        type: field.type,
        required: field.required,
      });
    });
    return map;
  }, [schemaFields]);

  // 抽取加载阶段数据的函数，供初始化和回滚后复用
  const loadStageData = async (resetState = true) => {
    if (!projectId || !stageId) return;

    if (resetState) {
      setStatusMessage(null);
      setFormData({});
      setDocContent("加载中...");
      setSelection(null);
      setKeywords([]);
      setCoreConcept("");
      setNameSuggestion("");
      setTagline("");
      setScore(null);
      setConsistency(null);
      setGapScore(null);
      setStructureScore(null);
      setFeasibilityScore(null);
      setEvaluationScore(null);
      setCoverage({});
      setSuggestions([]);
      setRagDocs([]);
      setWebDocs([]);
      setShowRag(false);
      setShowFillPanel(false);
      setFillSuggestions({});
      setFillSelections({});
      setFillNotes("");
      setFillError(null);
      setFillOverwrite(false);
    }
    setIsLoadingStage(true);

    try {
      const res = await fetch(`/api/project/${projectId}/stage/${stageId}`);
      if (!res.ok) {
        throw new Error("加载阶段数据失败");
      }
      const data = await res.json();
      if (data.success) {
        const stage = data.stage || {};
        setFormData(stage.input || {});
        const output = stage.output || {};
        const baseContent =
          typeof output === "string"
            ? output
            : output.report || output.content || "";
        setDocContent(baseContent || "");
        if (Array.isArray(output.keywords)) setKeywords(output.keywords);
        if (output.coreConcept || output.core_concept) {
          setCoreConcept(output.coreConcept || output.core_concept || "");
        }
        if (output.nameSuggestion || output.name) {
          setNameSuggestion(output.nameSuggestion || output.name || "");
        }
        if (output.tagline) setTagline(output.tagline);
        if (output.coverage?.dimensions)
          setCoverage(output.coverage.dimensions);
        if (Array.isArray(output.suggestions))
          setSuggestions(output.suggestions);
        const ragResults = Array.isArray((output as any).rag_results)
          ? (output as any).rag_results
          : [];
        const webResults = Array.isArray((output as any).web_results)
          ? (output as any).web_results
          : [];
        setRagDocs(ragResults);
        setWebDocs(webResults);
        setShowRag(ragResults.length + webResults.length > 0);
        if (output.consistency?.score !== undefined)
          setConsistency(output.consistency.score);
        if (output.gapAnalysis?.score !== undefined)
          setGapScore(output.gapAnalysis.score);
        if (output.structureScore?.score !== undefined)
          setStructureScore(output.structureScore.score);
        if (output.feasibility?.score !== undefined)
          setFeasibilityScore(output.feasibility.score);
        if (output.evaluationScore?.score !== undefined)
          setEvaluationScore(output.evaluationScore.score);
        if (stage.diagnostic_score?.overall !== undefined) {
          setScore(stage.diagnostic_score.overall);
        } else if (output.theory_fit_score !== undefined) {
          setScore(output.theory_fit_score);
        } else if (output.coverage?.overall !== undefined) {
          setScore(output.coverage.overall);
        } else if (output.suitability?.score !== undefined) {
          setScore(output.suitability.score);
        } else if (output.consistency?.score !== undefined) {
          setScore(output.consistency.score);
        } else {
          setScore(null);
        }
        return true;
      } else {
        setDocContent("");
        return false;
      }
    } catch (error) {
      console.error("Load stage failed:", error);
      setDocContent("");
      return false;
    } finally {
      setIsLoadingStage(false);
    }
  };

  // 回滚后刷新内容的回调
  const handleVersionRollback = async () => {
    setStatusMessage("正在刷新内容...");
    await loadStageData(false); // 不重置状态，直接刷新
    setStatusMessage("已回滚到指定版本");
  };

  useEffect(() => {
    loadStageData(true);
  }, [projectId, stageId]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const handleFormChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const isEmptyValue = (value: any) => {
    if (value === null || value === undefined) return true;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "string") return value.trim().length === 0;
    return false;
  };

  const formatSuggestionValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.join("、");
    }
    if (value === null || value === undefined) return "";
    return String(value);
  };

  const handleApplySelection = (replacement: string) => {
    if (!selection) {
      setDocContent(replacement);
      return;
    }
    setDocContent((prev) => {
      const before = prev.slice(0, selection.start);
      const after = prev.slice(selection.end);
      return `${before}${replacement}${after}`;
    });
    setSelection((prev) =>
      prev
        ? {
          text: replacement,
          start: prev.start,
          end: prev.start + replacement.length,
        }
        : null
    );
  };

  const handleSaveInput = async () => {
    try {
      setIsSaving(true);
      setStatusMessage(null);

      const res = await fetch(
        `/api/project/${projectId}/stage/${stageId}/input`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: formData,
            // Send edited document content - allow empty string to detect changes
            // Only skip if docContent is null or undefined
            output:
              docContent !== null && docContent !== undefined
                ? docContent
                : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "保存失败");
      }
      // Check if a new version was created (if content changed)
      const message = docContent
        ? "输入和内容已保存" + (data.versionCreated ? "（已创建新版本）" : "")
        : "输入已保存";
      setStatusMessage(message);
    } catch (error: any) {
      console.error("Save input failed:", error);
      setStatusMessage(error.message || "保存输入失败");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkComplete = async () => {
    try {
      setIsCompleting(true);
      setStatusMessage(null);
      const res = await fetch(
        `/api/project/${projectId}/stage/${stageId}/complete`,
        {
          method: "POST",
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "标记完成失败");
      }
      setStatusMessage("已标记完成");
      // Dispatch event to notify sidebar to refresh progress
      window.dispatchEvent(
        new CustomEvent("stage-completed", {
          detail: { stageId, projectId },
        })
      );
    } catch (error: any) {
      console.error("Complete stage failed:", error);
      setStatusMessage(error.message || "标记完成失败");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleApplyDiff = async (content: string) => {
    try {
      const targetField = "philosophy_statement_hint";

      const res = await fetch("/api/collab/apply-diff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_text: content, target_field: targetField }),
      });

      const data = await res.json();
      if (data.success) {
        handleFormChange(targetField, data.extracted_value);
        alert(`已将内容应用到 ${targetField}`);
      }
    } catch (error) {
      console.error("Failed to apply diff:", error);
      alert("应用失败，请稍后重试。");
    }
  };

  const getDefaultQuery = () =>
    stageId === "Q1"
      ? "学校课程情境 SWOT 教育资源"
      : stageId === "Q2"
        ? "教育哲学 本地化"
        : stageId === "Q3"
          ? "办学理念 核心概念"
          : stageId === "Q4"
            ? "育人目标 五育并举"
            : stageId === "Q5"
              ? "课程命名 校本课程"
              : stageId === "Q6"
                ? "课程理念 价值取向"
                : stageId === "Q7"
                  ? "分学段课程目标 案例"
                  : stageId === "Q8"
                    ? "课程结构 模块映射"
                    : stageId === "Q9"
                      ? "课程实施 路径/研学/节庆"
                      : "课程评价 335 成长体系 项目化评价";

  const handleRagSearch = async () => {
    try {
      setShowRag(true);
      const defaultQuery = getDefaultQuery();
      const res = await fetch(
        `/api/project/${projectId}/stage/${stageId}/rag/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: defaultQuery }),
        }
      );
      const data = await res.json();
      if (data.success) {
        const nextRag = Array.isArray(data.results) ? data.results : [];
        setRagDocs(nextRag);
        setShowRag(nextRag.length + webDocs.length > 0);
        return nextRag;
      }
    } catch (error) {
      console.error("RAG Search failed:", error);
    }
    return [];
  };

  const handleWebSearch = async () => {
    try {
      if (stageId === "Q1" && isEmptyValue(formData.school_name)) {
        const message = "请先填写学校名称后再进行网络搜索";
        setStatusMessage(message);
        setFillError(message);
        return [];
      }
      setShowRag(true);
      const defaultQuery = getDefaultQuery();
      const res = await fetch(
        `/api/project/${projectId}/stage/${stageId}/web/search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: defaultQuery,
            formData,
            fetch_content: true,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Web search failed");
      }
      const nextWeb = Array.isArray(data.results) ? data.results : [];
      setWebDocs(nextWeb);
      setShowRag(ragDocs.length + nextWeb.length > 0);
      return nextWeb;
    } catch (error: any) {
      console.error("Web Search failed:", error);
      setStatusMessage(error.message || "网络搜索失败");
    }
    return [];
  };

  const handleAiFill = async () => {
    try {
      if (stageId === "Q1" && isEmptyValue(formData.school_name)) {
        const message = "请先填写学校名称后再进行 AI 填写";
        setFillError(message);
        setStatusMessage(message);
        return;
      }
      const hasEmptyField = schemaFields.some((field) =>
        isEmptyValue(formData[field.key])
      );
      if (!hasEmptyField && !fillOverwrite) {
        const message = "当前表单已填写完成，如需优化请勾选覆盖已有内容";
        setFillError(message);
        setStatusMessage(message);
        return;
      }
      setIsFilling(true);
      setFillError(null);
      setFillNotes("");

      let nextWeb = webDocs;
      if (nextWeb.length === 0) {
        nextWeb = await handleWebSearch();
      }

      const res = await fetch(
        `/api/project/${projectId}/stage/${stageId}/assist/fill`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            formData,
            schemaFields,
            references: nextWeb,
            mode: fillOverwrite ? "overwrite" : "suggest",
          }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "AI 填写失败");
      }

      const suggestions = data.suggestions || {};
      const selections: Record<string, boolean> = {};
      Object.keys(suggestions).forEach((key) => {
        selections[key] = isEmptyValue(formData[key]);
      });
      setFillSuggestions(suggestions);
      setFillSelections(selections);
      setFillNotes(data.notes || "");
      setShowFillPanel(true);
      setStatusMessage("已生成表单填写建议");
    } catch (error: any) {
      console.error("AI Fill failed:", error);
      setFillError(error.message || "AI 填写失败");
      setStatusMessage(error.message || "AI 填写失败");
    } finally {
      setIsFilling(false);
    }
  };

  const applyFillSuggestions = () => {
    setFormData((prev) => {
      const next = { ...prev };
      Object.entries(fillSuggestions).forEach(([key, value]) => {
        if (!fillSelections[key]) return;
        if (!fillOverwrite && !isEmptyValue(prev[key])) return;
        next[key] = value;
      });
      return next;
    });
    setShowFillPanel(false);
    setStatusMessage("已应用表单建议");
  };

  const handleAiAssist = async () => {
    // Create new AbortController for this generation
    const controller = new AbortController();
    setAbortController(controller);
    let lastPayload: any = null;
    let streamedContent = "";

    try {
      setIsGenerating(true);
      setStatusMessage("正在生成...");
      setDocContent("");

      const response = await fetch(
        `/api/project/${projectId}/stage/${stageId}/generate?stream=1`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ formData, useRag, useWeb, includeCitations }),
          signal: controller.signal,
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const applyResult = (data: any) => {
        if (data.report || data.content)
          setDocContent(data.report || data.content || "");
        if (data.keywords) setKeywords(data.keywords || []);
        if (data.coreConcept) setCoreConcept(data.coreConcept || "");
        if (data.nameSuggestion) setNameSuggestion(data.nameSuggestion || "");
        if (data.tagline) setTagline(data.tagline || "");

        if (data.theoryFitScore !== undefined) setScore(data.theoryFitScore);
        else if (data.coverage?.overall !== undefined)
          setScore(data.coverage.overall);
        else if (data.suitability?.score !== undefined)
          setScore(data.suitability.score);
        else if (data.consistency?.score !== undefined)
          setScore(data.consistency.score);
        else if (data.gapAnalysis?.score !== undefined)
          setScore(data.gapAnalysis.score);
        else if (data.structureScore?.score !== undefined)
          setScore(data.structureScore.score);
        else if (data.feasibility?.score !== undefined)
          setScore(data.feasibility.score);
        else if (data.evaluationScore?.score !== undefined)
          setScore(data.evaluationScore.score);
        else setScore(null);

        if (data.consistency?.score !== undefined)
          setConsistency(data.consistency.score);
        else setConsistency(null);
        if (data.gapAnalysis?.score !== undefined)
          setGapScore(data.gapAnalysis.score);
        else setGapScore(null);
        if (data.structureScore?.score !== undefined)
          setStructureScore(data.structureScore.score);
        else setStructureScore(null);
        if (data.feasibility?.score !== undefined)
          setFeasibilityScore(data.feasibility.score);
        else setFeasibilityScore(null);
        if (data.evaluationScore?.score !== undefined)
          setEvaluationScore(data.evaluationScore.score);
        else setEvaluationScore(null);
        if (data.coverage?.dimensions) setCoverage(data.coverage.dimensions);
        else setCoverage({});
        setSuggestions(data.suggestions || []);
        const nextRag = Array.isArray(data.ragResults)
          ? data.ragResults
          : ragDocs;
        const nextWeb = Array.isArray(data.webResults)
          ? data.webResults
          : webDocs;
        if (Array.isArray(data.ragResults)) setRagDocs(nextRag);
        if (Array.isArray(data.webResults)) setWebDocs(nextWeb);
        if (useRag || useWeb) {
          setShowRag(nextRag.length + nextWeb.length > 0);
        }
      };

      if (reader) {
        while (true) {
          // Check if aborted
          if (controller.signal.aborted) {
            console.log("[Generation] Aborted by user");
            setStatusMessage("生成已中断");
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";
          for (const part of parts) {
            if (!part.startsWith("data:")) continue;
            const json = part.replace(/^data:\s*/, "");
            if (!json) continue;
            try {
              const evt = JSON.parse(json);
              if (evt.event === "start") {
                setStatusMessage(evt.message || "正在生成...");
                setDocContent("");
              } else if (evt.event === "token") {
                streamedContent += evt.content || "";
                setDocContent(streamedContent);
              } else if (evt.event === "done") {
                lastPayload = evt;
                applyResult(evt);
                setStatusMessage("生成完成");
                setDocContent(evt.report || evt.content || streamedContent);
              } else if (evt.event === "error") {
                throw new Error(evt.message || "Generation failed");
              }
            } catch (err) {
              console.warn("Stream parse error", err);
            }
          }
        }
      } else {
        // Fallback to JSON if stream unavailable or no events parsed
        const text = await response.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            if (!response.ok || data.success === false) {
              throw new Error(data.error || "Generation failed");
            }
            lastPayload = data;
            applyResult(data);
            setStatusMessage("生成完成");
            setDocContent(data.report || data.content || "");
          } catch (e) {
            throw new Error("生成响应解析失败");
          }
        }
      }
      if (lastPayload) {
        setStatusMessage("生成完成");
        setDocContent(
          lastPayload.report || lastPayload.content || streamedContent
        );
      } else if (streamedContent) {
        setDocContent(streamedContent);
      }
    } catch (error: any) {
      // Check if error is due to abort
      if (error.name === "AbortError" || controller.signal.aborted) {
        console.log("[Generation] Aborted by user");
        setStatusMessage("生成已中断");
        setDocContent(streamedContent || docContent); // Keep what was generated so far
      } else {
        console.error("AI Assist failed:", error);
        setDocContent("生成失败，请检查必填项或稍后重试。");
        setStatusMessage(error.message || "生成失败");
      }
    } finally {
      setIsGenerating(false);
      setAbortController(null);
    }
  };

  const handleStopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setStatusMessage("正在中断生成...");
    }
  };

  const stageTitle = stageId ? `${stageId}. ${schema.name}` : schema.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <StageHeader
        title={stageTitle}
        description={schema.description}
        projectId={projectId}
      />

      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-slate-800/70 dark:bg-slate-900/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto py-3">
            {STAGE_NAV.map((stage) => {
              const active = stage.id === stageId;
              return (
                <Link
                  key={stage.id}
                  href={`/project/${projectId}/stage/${stage.id}`}
                  className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all ${active
                    ? "border-cyan-500/70 bg-gradient-to-r from-cyan-500/20 to-emerald-400/20 text-slate-900 shadow-sm dark:text-white"
                    : "border-slate-200 bg-white/70 text-slate-600 hover:border-cyan-200 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-cyan-500/40"
                    }`}
                >
                  <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-white/80">
                    {stage.id}
                  </span>
                  <span className="whitespace-nowrap">{stage.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6">
        <div className="grid items-start gap-6 lg:grid-cols-[360px,1fr] xl:grid-cols-[380px,1fr]">
          <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900">
            <div className="pointer-events-none absolute -left-10 top-10 h-32 w-32 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">
                    Stage inputs
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {schema.name}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    用具体场景和例子喂给 AI，输出会更贴近学校实际。
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200">
                  {stageId}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                  聚焦 3-5 个要点
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                  避免空泛口号
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
                  有量化数据更佳
                </span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAiFill}
                  disabled={isFilling || isLoadingStage}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-indigo-900/40 dark:bg-indigo-900/30 dark:text-indigo-200 dark:hover:border-indigo-700"
                  type="button"
                >
                  <Sparkles className="h-4 w-4" />
                  {isFilling ? "填写中..." : "AI 填写表单"}
                </button>
                <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={fillOverwrite}
                    onChange={(e) => setFillOverwrite(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:checked:border-cyan-500"
                  />
                  覆盖已有内容
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  使用网络搜索生成草稿，用户可自行修改
                </span>
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 bg-white/80 shadow-inner dark:border-slate-800 dark:bg-slate-900/70">
                <div className="max-h-none overflow-visible rounded-xl md:max-h-[calc(100vh-280px)] md:overflow-y-auto">
                  <DynamicFormRenderer
                    schema={schema}
                    data={formData}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200/70 bg-slate-50/70 px-4 py-3 dark:border-slate-800/60 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    AI Draft · Feedback
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-slate-800 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-700">
                      <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                      实时预览 & 逐句编辑
                    </span>
                    {statusMessage && (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800">
                        {statusMessage}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:checked:border-cyan-500"
                      checked={useRag}
                      onChange={(e) => setUseRag(e.target.checked)}
                    />
                    使用知识库
                  </label>
                  <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:checked:border-cyan-500"
                      checked={useWeb}
                      onChange={(e) => setUseWeb(e.target.checked)}
                    />
                    使用网络搜索
                  </label>
                  <label className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:checked:border-cyan-500"
                      checked={includeCitations}
                      onChange={(e) => setIncludeCitations(e.target.checked)}
                    />
                    包含引用
                  </label>
                  <button
                    onClick={handleSaveInput}
                    disabled={isSaving || isLoadingStage}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-cyan-500/50"
                    type="button"
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "保存中..." : "保存输入"}
                  </button>
                  <button
                    onClick={handleMarkComplete}
                    disabled={isCompleting || isLoadingStage}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:border-emerald-700"
                    type="button"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isCompleting ? "标记中..." : "标记完成"}
                  </button>
                  <button
                    onClick={() => setShowVersions(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-cyan-500/50"
                    type="button"
                  >
                    <History className="h-4 w-4" />
                    版本
                  </button>
                  <button
                    onClick={() => setIsChatOpen((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-cyan-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:hover:border-cyan-500/50"
                    type="button"
                  >
                    <MessageSquare className="h-4 w-4" />
                    {isChatOpen ? "收起助手" : "AI 助手"}
                  </button>
                  <button
                    onClick={handleRagSearch}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50/70 px-3 py-2 text-xs font-semibold text-cyan-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-cyan-900/40 dark:bg-cyan-900/30 dark:text-cyan-200 dark:hover:border-cyan-700"
                    type="button"
                  >
                    <BookOpen className="h-4 w-4" />
                    检索知识库
                  </button>
                  <button
                    onClick={handleWebSearch}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-200 dark:hover:border-emerald-700"
                    type="button"
                  >
                    <Globe className="h-4 w-4" />
                    网络搜索
                  </button>
                  {isGenerating ? (
                    <button
                      onClick={handleStopGeneration}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-70"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                      停止生成
                    </button>
                  ) : (
                    <button
                      onClick={handleAiAssist}
                      disabled={isLoadingStage}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-transparent bg-gradient-to-r from-cyan-500 to-emerald-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-500/90 hover:to-emerald-500/90 disabled:cursor-not-allowed disabled:opacity-70"
                      type="button"
                    >
                      <Sparkles className="h-4 w-4" />
                      AI 生成陈述
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-3 px-4 pb-4 pt-3">
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-200">
                {score !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200/70 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-800/70">
                    综合分 {score}
                  </span>
                )}
                {stageId === "Q6" && consistency !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 font-semibold text-green-700 ring-1 ring-green-200/70 dark:bg-green-900/30 dark:text-green-200 dark:ring-green-800/70">
                    一致性 {consistency}
                  </span>
                )}
                {stageId === "Q7" && gapScore !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700 ring-1 ring-orange-200/70 dark:bg-orange-900/30 dark:text-orange-200 dark:ring-orange-800/70">
                    达成度 {gapScore}
                  </span>
                )}
                {stageId === "Q8" && structureScore !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-3 py-1 font-semibold text-teal-700 ring-1 ring-teal-200/70 dark:bg-teal-900/30 dark:text-teal-200 dark:ring-teal-800/70">
                    结构评分 {structureScore}
                  </span>
                )}
                {stageId === "Q9" && feasibilityScore !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-lime-100 px-3 py-1 font-semibold text-lime-700 ring-1 ring-lime-200/70 dark:bg-lime-900/30 dark:text-lime-200 dark:ring-lime-800/70">
                    可行性 {feasibilityScore}
                  </span>
                )}
                {stageId === "Q10" && evaluationScore !== null && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 font-semibold text-sky-700 ring-1 ring-sky-200/70 dark:bg-sky-900/30 dark:text-sky-200 dark:ring-sky-800/70">
                    科学性 {evaluationScore}
                  </span>
                )}
                {coreConcept && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 font-semibold text-blue-700 ring-1 ring-blue-200/70 dark:bg-blue-900/30 dark:text-blue-200 dark:ring-blue-800/70">
                    核心概念 {coreConcept}
                  </span>
                )}
                {stageId === "Q5" && nameSuggestion && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 font-semibold text-purple-700 ring-1 ring-purple-200/70 dark:bg-purple-900/30 dark:text-purple-200 dark:ring-purple-800/70">
                    推荐名称 {nameSuggestion}
                  </span>
                )}
                {stageId === "Q5" && tagline && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 font-semibold text-pink-700 ring-1 ring-pink-200/70 dark:bg-pink-900/30 dark:text-pink-200 dark:ring-pink-800/70">
                    口号 {tagline}
                  </span>
                )}
                {stageId === "Q4" && Object.keys(coverage).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {FIVE_VIRTUES.map((v) => (
                      <span
                        key={v}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-800 ring-1 ring-amber-200/70 dark:bg-amber-900/30 dark:text-amber-100 dark:ring-amber-800/70"
                      >
                        {v} {coverage[v] ?? "-"}
                      </span>
                    ))}
                  </div>
                )}
                {keywords.length > 0 && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-white/5 dark:text-slate-100 dark:ring-slate-700">
                    关键词：{keywords.join(" / ")}
                  </span>
                )}
              </div>

              {suggestions.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-50">
                    <BookOpen className="h-4 w-4" />
                    改进建议
                  </div>
                  <div className="space-y-1">
                    {suggestions.map((s, idx) => (
                      <div key={idx} className="leading-relaxed">
                        • {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex min-h-[520px] flex-col gap-4 lg:flex-row">
                <div className="flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
                  <TiptapEditor
                    content={docContent}
                    onChange={setDocContent}
                    onApply={handleApplyDiff}
                    onAiAssist={handleAiAssist}
                    onSelectionChange={setSelection}
                    highlightSelection={selection}
                    references={combinedReferences}
                  />
                </div>

                {showRag && (
                  <div className="w-full shrink-0 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 lg:w-72">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Quote className="h-4 w-4 text-cyan-500" />
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          参考资料
                        </h3>
                      </div>
                      <button
                        onClick={() => setShowRag(false)}
                        className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="space-y-3 text-xs text-slate-600 dark:text-slate-200">
                      {combinedReferences.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          暂无结果
                        </div>
                      ) : (
                        combinedReferences.map((doc, idx) => {
                          const fileName =
                            doc?.metadata?.original_name ||
                            doc?.title ||
                            `引用 ${idx + 1}`;
                          const heading =
                            doc?.metadata?.heading ||
                            doc?.metadata?.title ||
                            "";
                          const snippet =
                            (doc?.content || "")
                              .split(/\n+/)
                              .map((s: string) => s.trim())
                              .filter(Boolean)[0] ||
                            doc?.content ||
                            "";
                          const chunkInfo =
                            doc?.metadata?.chunk_index !== undefined &&
                              doc?.metadata?.total_chunks
                              ? `片段 ${doc.metadata.chunk_index + 1}/${doc.metadata.total_chunks
                              }`
                              : null;
                          return (
                            <div
                              key={doc.id || `${fileName}-${idx}`}
                              className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm ring-1 ring-slate-100/70 dark:border-slate-700/80 dark:bg-slate-800/70 dark:ring-slate-900/50"
                            >
                              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                                <span className="rounded-full bg-white px-1.5 py-0.5 text-xs font-semibold text-cyan-600 shadow-sm dark:bg-slate-800">
                                  {idx + 1}
                                </span>
                                <span className="truncate">{fileName}</span>
                              </div>
                              {heading && (
                                <div className="mb-1 text-[13px] font-semibold text-slate-900 dark:text-slate-100">
                                  {heading}
                                </div>
                              )}
                              <div className="mb-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                                {snippet}
                              </div>
                              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="h-3.5 w-3.5 text-cyan-500" />
                                  {doc.source || "知识库"}
                                  {chunkInfo && (
                                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                      {chunkInfo}
                                    </span>
                                  )}
                                </span>
                                {doc.score !== undefined && (
                                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {(doc.score * 100).toFixed(0)}% Match
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {showFillPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                AI 填写建议
              </h3>
              <button
                onClick={() => setShowFillPanel(false)}
                className="rounded border px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                type="button"
              >
                关闭
              </button>
            </div>
            {fillNotes ? (
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                {fillNotes}
              </div>
            ) : null}
            {fillError ? (
              <div className="mt-2 text-xs text-red-600">{fillError}</div>
            ) : null}
            <div className="mt-3 max-h-80 space-y-3 overflow-y-auto pr-1 text-xs text-slate-600 dark:text-slate-200">
              {Object.keys(fillSuggestions).length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  暂无可填建议
                </div>
              ) : (
                Object.entries(fillSuggestions).map(([key, value]) => {
                  const meta = fieldMeta.get(key);
                  const label = meta?.label || key;
                  const currentValue = formData[key];
                  const hasCurrent = !isEmptyValue(currentValue);
                  return (
                    <div
                      key={key}
                      className="rounded-xl border border-slate-200/90 bg-white px-3 py-3 shadow-sm ring-1 ring-slate-100/70 dark:border-slate-700/80 dark:bg-slate-800/70 dark:ring-slate-900/50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-100">
                          <input
                            type="checkbox"
                            checked={!!fillSelections[key]}
                            onChange={(e) =>
                              setFillSelections((prev) => ({
                                ...prev,
                                [key]: e.target.checked,
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-200 dark:border-slate-600 dark:bg-slate-900 dark:checked:border-cyan-500"
                          />
                          {label}
                        </label>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                          {key}
                        </span>
                      </div>
                      <div className="mt-2 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">
                        建议：{formatSuggestionValue(value) || "（空）"}
                      </div>
                      {hasCurrent ? (
                        <div className="mt-1 text-[11px] text-slate-400">
                          当前：{formatSuggestionValue(currentValue)}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                已选择 {Object.values(fillSelections).filter(Boolean).length} 项
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFillPanel(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm hover:border-slate-300 dark:border-slate-700 dark:text-slate-200"
                  type="button"
                >
                  取消
                </button>
                <button
                  onClick={applyFillSuggestions}
                  className="rounded-lg border border-cyan-200 bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-cyan-600"
                  type="button"
                >
                  应用选中
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showVersions && (
        <div className="fixed right-4 top-20 z-50 flex max-h-[82vh] w-80 max-w-[90vw] flex-col rounded-2xl border bg-card p-3 text-card-foreground shadow-2xl sm:w-96">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">版本历史</h3>
            <button
              onClick={() => setShowVersions(false)}
              className="rounded border px-2 py-1 text-xs hover:bg-muted"
              type="button"
            >
              关闭
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            <VersionHistory
              projectId={projectId || ""}
              stageId={stageId || ""}
              onRollback={handleVersionRollback}
            />
          </div>
        </div>
      )}

      {isChatOpen && (
        <div className="fixed right-4 bottom-4 z-40 w-[360px] max-w-[90vw] overflow-hidden rounded-xl border bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900">
          <ChatWindow
            projectId={projectId || ""}
            stageId={stageId || ""}
            contextInput={formData}
            contextOutput={docContent}
            selectedText={selection?.text}
            onApplyContent={setDocContent}
            onApplySelection={handleApplySelection}
            onClose={() => setIsChatOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
