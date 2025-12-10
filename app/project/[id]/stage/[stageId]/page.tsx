"use client";

import { useEffect, useMemo, useState } from "react";
import { StageHeader } from "@/components/StageHeader";
import { DynamicFormRenderer } from "@/components/DynamicFormRenderer";
import { TiptapEditor } from "@/components/TiptapEditor";
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
    const stageId = Array.isArray(params?.stageId) ? params.stageId[0] : params?.stageId;
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [docContent, setDocContent] = useState("");
    const [selection, setSelection] = useState<{ text: string; start: number; end: number } | null>(null);
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
    const [ragDocs, setRagDocs] = useState<any[]>([]);
    const [showRag, setShowRag] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isLoadingStage, setIsLoadingStage] = useState(true);
    const [isFormCollapsed, setIsFormCollapsed] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [useRag, setUseRag] = useState(false);

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

    useEffect(() => {
        if (!projectId || !stageId) return;
        let active = true;
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
        setShowRag(false);
        setIsLoadingStage(true);

        const loadStage = async () => {
            try {
                const res = await fetch(`/api/project/${projectId}/stage/${stageId}`);
                if (!res.ok) {
                    throw new Error("加载阶段数据失败");
                }
                const data = await res.json();
                if (!active) return;
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
                    if (output.coverage?.dimensions) setCoverage(output.coverage.dimensions);
                    if (Array.isArray(output.suggestions)) setSuggestions(output.suggestions);
                    if (output.consistency?.score !== undefined) setConsistency(output.consistency.score);
                    if (output.gapAnalysis?.score !== undefined) setGapScore(output.gapAnalysis.score);
                    if (output.structureScore?.score !== undefined) setStructureScore(output.structureScore.score);
                    if (output.feasibility?.score !== undefined) setFeasibilityScore(output.feasibility.score);
                    if (output.evaluationScore?.score !== undefined) setEvaluationScore(output.evaluationScore.score);
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
                } else {
                    setDocContent("");
                }
            } catch (error) {
                if (active) {
                    console.error("Load stage failed:", error);
                    setDocContent("");
                }
            } finally {
                if (active) setIsLoadingStage(false);
            }
        };

        loadStage();
        return () => {
            active = false;
        };
    }, [projectId, stageId]);

    const handleFormChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
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
            const res = await fetch(`/api/project/${projectId}/stage/${stageId}/input`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input: formData }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "保存失败");
            }
            setStatusMessage("输入已保存");
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
            const res = await fetch(`/api/project/${projectId}/stage/${stageId}/complete`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "标记完成失败");
            }
            setStatusMessage("已标记完成");
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

    const handleRagSearch = async () => {
        try {
            setShowRag(true);
            const defaultQuery =
                stageId === "Q2"
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
            const res = await fetch(`/api/project/${projectId}/stage/${stageId}/rag/search`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query: defaultQuery }),
            });
            const data = await res.json();
            if (data.success) {
                setRagDocs(data.results);
            }
        } catch (error) {
            console.error("RAG Search failed:", error);
        }
    };

    const handleAiAssist = async () => {
        try {
            setIsGenerating(true);
            setStatusMessage("正在生成...");
            setDocContent("");
            let lastPayload: any = null;
            let streamedContent = "";

            const response = await fetch(
                `/api/project/${projectId}/stage/${stageId}/generate?stream=1`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "text/event-stream",
                    },
                    body: JSON.stringify({ formData, useRag }),
                }
            );

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            const applyResult = (data: any) => {
                if (data.report || data.content) setDocContent(data.report || data.content || "");
                if (data.keywords) setKeywords(data.keywords || []);
                if (data.coreConcept) setCoreConcept(data.coreConcept || "");
                if (data.nameSuggestion) setNameSuggestion(data.nameSuggestion || "");
                if (data.tagline) setTagline(data.tagline || "");

                if (data.theoryFitScore !== undefined) setScore(data.theoryFitScore);
                else if (data.coverage?.overall !== undefined) setScore(data.coverage.overall);
                else if (data.suitability?.score !== undefined) setScore(data.suitability.score);
                else if (data.consistency?.score !== undefined) setScore(data.consistency.score);
                else if (data.gapAnalysis?.score !== undefined) setScore(data.gapAnalysis.score);
                else if (data.structureScore?.score !== undefined) setScore(data.structureScore.score);
                else if (data.feasibility?.score !== undefined) setScore(data.feasibility.score);
                else if (data.evaluationScore?.score !== undefined) setScore(data.evaluationScore.score);
                else setScore(null);

                if (data.consistency?.score !== undefined) setConsistency(data.consistency.score);
                else setConsistency(null);
                if (data.gapAnalysis?.score !== undefined) setGapScore(data.gapAnalysis.score);
                else setGapScore(null);
                if (data.structureScore?.score !== undefined) setStructureScore(data.structureScore.score);
                else setStructureScore(null);
                if (data.feasibility?.score !== undefined) setFeasibilityScore(data.feasibility.score);
                else setFeasibilityScore(null);
                if (data.evaluationScore?.score !== undefined) setEvaluationScore(data.evaluationScore.score);
                else setEvaluationScore(null);
                if (data.coverage?.dimensions) setCoverage(data.coverage.dimensions);
                else setCoverage({});
                setSuggestions(data.suggestions || []);
                if (Array.isArray(data.ragResults)) {
                    setRagDocs(data.ragResults);
                    setShowRag(useRag && data.ragResults.length > 0);
                }
            };

            if (reader) {
                while (true) {
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
                setDocContent(lastPayload.report || lastPayload.content || streamedContent);
            } else if (streamedContent) {
                setDocContent(streamedContent);
            }
        } catch (error: any) {
            console.error("AI Assist failed:", error);
            setDocContent("生成失败，请检查必填项或稍后重试。");
            setStatusMessage(error.message || "生成失败");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <>
            <StageHeader
                title={`${stageId}. ${schema.name}`}
                description={schema.description}
            />
            <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b px-4 py-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                    {STAGE_NAV.map((stage) => {
                        const active = stage.id === stageId;
                        return (
                            <Link
                                key={stage.id}
                                href={`/project/${projectId}/stage/${stage.id}`}
                                className={`px-3 py-1.5 text-sm rounded-full border transition ${
                                    active
                                        ? "border-primary text-primary bg-primary/10"
                                        : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/40"
                                }`}
                            >
                                {stage.id} {stage.name}
                            </Link>
                        );
                    })}
                </div>
            </div>
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Form */}
                <div className="w-[42%] border-r bg-gray-50/30 dark:bg-zinc-900/30 flex flex-col">
                    <div className="p-2 border-b text-xs text-muted-foreground">
                        {schema.name}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <DynamicFormRenderer
                            schema={schema}
                            data={formData}
                            onChange={handleFormChange}
                        />
                    </div>
                </div>

                {/* Right Panel: Doc Editor + RAG Sidebar */}
                <div className="flex-1 bg-background flex">
                    <div className="flex-1 flex flex-col">
                        <div className="p-3 border-b flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                {score !== null && (
                                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 text-xs">
                                        综合分 {score}
                                    </span>
                                )}
                                {stageId === "Q6" && consistency !== null && (
                                    <span className="rounded-full bg-green-100 px-3 py-1 text-green-700 text-xs">
                                        一致性 {consistency}
                                    </span>
                                )}
                                {stageId === "Q7" && gapScore !== null && (
                                    <span className="rounded-full bg-orange-100 px-3 py-1 text-orange-700 text-xs">
                                        达成度 {gapScore}
                                    </span>
                                )}
                                {stageId === "Q8" && structureScore !== null && (
                                    <span className="rounded-full bg-teal-100 px-3 py-1 text-teal-700 text-xs">
                                        结构评分 {structureScore}
                                    </span>
                                )}
                                {stageId === "Q9" && feasibilityScore !== null && (
                                    <span className="rounded-full bg-lime-100 px-3 py-1 text-lime-700 text-xs">
                                        可行性 {feasibilityScore}
                                    </span>
                                )}
                                {stageId === "Q10" && evaluationScore !== null && (
                                    <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700 text-xs">
                                        科学性 {evaluationScore}
                                    </span>
                                )}
                                {coreConcept && (
                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 text-xs">
                                        核心概念 {coreConcept}
                                    </span>
                                )}
                                {keywords.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        关键词：{keywords.join(" / ")}
                                    </span>
                                )}
                                {stageId === "Q5" && nameSuggestion && (
                                    <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700 text-xs">
                                        推荐名称 {nameSuggestion}
                                    </span>
                                )}
                                {stageId === "Q5" && tagline && (
                                    <span className="rounded-full bg-pink-100 px-3 py-1 text-pink-700 text-xs">
                                        口号 {tagline}
                                    </span>
                                )}
                                {stageId === "Q4" && Object.keys(coverage).length > 0 && (
                                    <div className="flex gap-2 items-center text-xs">
                                        {FIVE_VIRTUES.map((v) => (
                                            <span key={v} className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                                                {v} {coverage[v] ?? "-"}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={useRag}
                                        onChange={(e) => setUseRag(e.target.checked)}
                                    />
                                    使用知识库
                                </label>
                                <button
                                    onClick={handleSaveInput}
                                    disabled={isSaving || isLoadingStage}
                                    className="text-xs border px-2 py-1 rounded hover:bg-muted disabled:opacity-50"
                                >
                                    {isSaving ? "保存中..." : "💾 保存输入"}
                                </button>
                                <button
                                    onClick={handleMarkComplete}
                                    disabled={isCompleting || isLoadingStage}
                                    className="text-xs border px-2 py-1 rounded hover:bg-muted disabled:opacity-50"
                                >
                                    {isCompleting ? "标记中..." : "✅ 标记完成"}
                                </button>
                                <button
                                    onClick={() => setShowVersions(true)}
                                    className="text-xs border px-2 py-1 rounded hover:bg-muted"
                                >
                                    🗂 版本
                                </button>
                                <button
                                    onClick={() => setIsChatOpen((v) => !v)}
                                    className="text-xs border px-2 py-1 rounded hover:bg-muted"
                                >
                                    {isChatOpen ? "收起助手" : "AI 助手"}
                                </button>
                                <button
                                    onClick={handleRagSearch}
                                    className="text-xs bg-secondary px-2 py-1 rounded hover:bg-secondary/80"
                                >
                                    📚 检索知识库
                                </button>
                                <button
                                    onClick={handleAiAssist}
                                    disabled={isGenerating || isLoadingStage}
                                    className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isGenerating ? "生成中..." : "AI 生成陈述"}
                                </button>
                            </div>
                        </div>
                        {statusMessage && (
                            <div className="px-3 pt-1 text-[11px] text-emerald-600">{statusMessage}</div>
                        )}
                        <div className="flex-1 overflow-y-auto">
                            {suggestions.length > 0 && (
                                <div className="p-3 border-b bg-muted/30 text-xs text-muted-foreground space-y-1">
                                    <div className="font-medium text-foreground">改进建议</div>
                                    {suggestions.map((s, idx) => (
                                        <div key={idx}>• {s}</div>
                                    ))}
                                </div>
                            )}
                            <TiptapEditor
                                content={docContent}
                                onChange={setDocContent}
                                onApply={handleApplyDiff}
                                onAiAssist={handleAiAssist}
                                onSelectionChange={setSelection}
                            />
                        </div>
                    </div>
                    {/* Sidebar */}
                    {showRag && (
                        <div className="w-64 border-l bg-muted/10 p-4 overflow-y-auto space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold text-sm">参考资料</h3>
                                <button onClick={() => setShowRag(false)} className="text-xs">✕</button>
                            </div>
                            <div className="space-y-3">
                                {ragDocs.length === 0 ? (
                                    <div className="text-xs text-muted-foreground">暂无结果</div>
                                ) : (
                                    ragDocs.map((doc) => (
                                        <div key={doc.id} className="p-3 rounded border bg-card text-card-foreground shadow-sm text-xs">
                                            <div className="font-medium mb-1 line-clamp-1">{doc.title}</div>
                                            <div className="text-muted-foreground line-clamp-3 mb-2">{doc.content}</div>
                                            <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                                                <span>{doc.source}</span>
                                                {doc.score !== undefined && <span>{(doc.score * 100).toFixed(0)}% Match</span>}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {showVersions && (
                <div className="fixed right-4 top-24 bottom-4 z-50 w-80 max-w-[85vw] bg-card text-card-foreground border shadow-2xl rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">版本历史</h3>
                        <button onClick={() => setShowVersions(false)} className="text-xs px-2 py-1 border rounded hover:bg-muted">关闭</button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <VersionHistory projectId={projectId || ""} stageId={stageId || ""} />
                    </div>
                </div>
            )}
            {isChatOpen && (
                <div className="fixed right-4 bottom-4 z-40 w-[360px] max-w-[90vw] border rounded-xl bg-white shadow-2xl dark:bg-zinc-900 dark:border-zinc-800 overflow-hidden">
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
        </>
    );
}
