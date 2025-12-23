"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface Selection {
  text: string;
  start: number;
  end: number;
}

interface EditorProps {
  content: string;
  onChange?: (value: string) => void;
  onApply?: (value: string) => void;
  onAiAssist?: () => void;
  onSelectionChange?: (selection: Selection | null) => void;
  /** External selection state to highlight in preview mode */
  highlightSelection?: Selection | null;
  /** Optional references (RAG docs) for rendering citation chips */
  references?: Array<{
    title?: string;
    content?: string;
    source?: string;
    metadata?: Record<string, any>;
  }>;
}

export function TiptapEditor({
  content,
  onChange,
  onApply,
  onAiAssist,
  onSelectionChange,
  highlightSelection,
  references,
}: EditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">("preview");
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    label: string;
    snippet: string;
    x: number;
    y: number;
  }>({ visible: false, label: "", snippet: "", x: 0, y: 0 });
  const [activeRef, setActiveRef] = useState<{
    visible: boolean;
    label: string;
    content: string;
    source: string;
    chunkInfo?: string;
    x: number;
    y: number;
  }>({ visible: false, label: "", content: "", source: "", x: 0, y: 0 });
  const markdownRef = useRef<HTMLDivElement>(null);

  const clampPosition = (x: number, y: number) => {
    if (typeof window === "undefined") return { x, y };
    const margin = 16;
    const maxX = window.innerWidth - margin;
    const minX = margin;
    return {
      x: Math.min(Math.max(x, minX), maxX),
      y,
    };
  };

  // 将包含制表符的连续行自动转换为 GFM 表格，便于生成内容正确渲染
  const normalizedContent = useMemo(() => {
    const lines = content.split("\n");
    const output: string[] = [];
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      const hasTabs = buffer.every((line) => line.includes("\t"));
      if (!hasTabs) {
        output.push(...buffer);
        buffer = [];
        return;
      }
      const rows = buffer.map((line) =>
        line.split(/\t+/).map((cell) => cell.trim())
      );
      const colCount = Math.max(...rows.map((r) => r.length));
      const header = rows[0] || [];
      const safeHeader = Array.from({ length: colCount }).map(
        (_, idx) => header[idx] || ""
      );
      const divider = Array.from({ length: colCount }).map(() => "---");
      const rest = rows
        .slice(1)
        .map((r) =>
          Array.from({ length: colCount }).map((_, idx) => r[idx] || "")
        );
      output.push(
        `| ${safeHeader.join(" | ")} |`,
        `| ${divider.join(" | ")} |`,
        ...rest.map((r) => `| ${r.join(" | ")} |`)
      );
      buffer = [];
    };

    for (const line of lines) {
      if (line.trim() === "") {
        flushBuffer();
        output.push(line);
      } else if (line.includes("\t")) {
        buffer.push(line);
      } else {
        flushBuffer();
        output.push(line);
      }
    }
    flushBuffer();

    return output.join("\n");
  }, [content]);

  // Create content with highlighted selection for preview mode
  const highlightedContent = useMemo(() => {
    if (!highlightSelection || !highlightSelection.text) {
      return normalizedContent;
    }

    const { start, end } = highlightSelection;

    const before = content.slice(0, start);
    const selected = content.slice(start, end);
    const after = content.slice(end);

    // Use HTML mark tag for highlighting with inline styles (Tailwind classes don't work in dynamic HTML)
    const highlighted = `${before}<mark style="background-color: #fde68a; padding: 0 2px; border-radius: 2px;">${selected}</mark>${after}`;

    return highlighted;
  }, [content, normalizedContent, highlightSelection]);

  // Render citations like numbered chips (avoids breaking markdown links)
  const citationEnhancedContent = useMemo(() => {
    const escapeHtml = (str: string) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const truncate = (str: string, max = 140) =>
      str.length <= max ? str : `${str.slice(0, max - 1)}…`;

    const refMap = new Map<
      number,
      { tooltip: string; label: string; snippet: string }
    >();
    (references || []).forEach((ref, idx) => {
      const label =
        ref?.metadata?.original_name ||
        ref?.metadata?.title ||
        ref?.title ||
        `引用 ${idx + 1}`;
      const snippet =
        (ref?.content || "")
          .split(/\n+/)
          .map((s) => s.trim())
          .filter(Boolean)[0] || "";
      const tooltip = [truncate(label, 80), truncate(snippet, 160)]
        .filter(Boolean)
        .join(" · ");
      refMap.set(idx + 1, {
        tooltip: escapeHtml(tooltip),
        label: escapeHtml(truncate(label, 120)),
        snippet: escapeHtml(truncate(snippet, 220)),
      });
    });

    // Clean previously rendered chips or emoji markers back to [n]
    const baseRaw = highlightSelection?.text
      ? highlightedContent
      : normalizedContent;
    const cleanBase = baseRaw
      // remove previously injected citation-chip spans to avoid nested HTML
      .replace(
        /<span class="citation-chip"[^>]*?>[^<]*?(\d+)[^<]*?<\/span>/gi,
        "[$1]"
      )
      // normalize emoji markers like "🔖 3" to [3]
      .replace(/🔖\s*(\d+)/g, "[$1]");

    const chipStyle =
      "display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:999px;border:1px solid #e2e8f0;background:linear-gradient(135deg,#f8fafc,#f1f5f9);color:#0f172a;font-size:11px;font-weight:600;box-shadow:0 1px 2px rgba(15,23,42,0.08);cursor:pointer;";
    return cleanBase.replace(/\[(\d+)\](?!\()/g, (_match, numStr) => {
      const num = Number(numStr);
      const info = refMap.get(num);
      const title = info?.tooltip || `引用 ${num}`;
      const label = info?.label || `引用 ${num}`;
      const snippet = info?.snippet || "";
      const ref = references?.[num - 1];
      const chunkIndex = ref?.metadata?.chunk_index;
      const totalChunks = ref?.metadata?.total_chunks;
      const chunkInfo =
        chunkIndex !== undefined && totalChunks !== undefined
          ? `片段 ${Number(chunkIndex) + 1}/${totalChunks}`
          : "";
      return `<span class="citation-chip" data-ref="${num}" data-label="${label}" data-snippet="${snippet}" data-chunk="${chunkInfo}" title="${title}" style="${chipStyle}">🔖 ${num}</span>`;
    });
  }, [highlightSelection, highlightedContent, normalizedContent, references]);

  // Attach hover/click listeners via delegation to ensure chips rendered are handled
  useEffect(() => {
    const container = markdownRef.current;
    if (!container) return;

    const decode = (s: string) =>
      s
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, "&");

    const onMouseOver = (ev: MouseEvent) => {
      const target = (ev.target as HTMLElement)?.closest(
        ".citation-chip"
      ) as HTMLSpanElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      const label = decode(target.dataset.label || "引用");
      const snippet = decode(target.dataset.snippet || "");
      const pos = clampPosition(rect.left + rect.width / 2, rect.bottom + 10);
      setTooltip({
        visible: true,
        label,
        snippet,
        x: pos.x,
        y: pos.y,
      });
    };

    const onMouseOut = (ev: MouseEvent) => {
      const related = ev.relatedTarget as HTMLElement | null;
      if (related && related.closest(".citation-chip")) return;
      setTooltip((prev) => ({ ...prev, visible: false }));
    };

    const onClick = (ev: MouseEvent) => {
      const target = (ev.target as HTMLElement)?.closest(
        ".citation-chip"
      ) as HTMLSpanElement | null;
      if (!target) return;
      const refIdx = Number(target.dataset.ref) || 0;
      const ref = references?.[refIdx - 1];
      const rect = target.getBoundingClientRect();
      const pos = clampPosition(rect.left + rect.width / 2, rect.bottom + 12);
      setActiveRef({
        visible: true,
        label: decode(
          target.dataset.label ||
            ref?.metadata?.original_name ||
            `引用 ${refIdx}`
        ),
        content: ref?.content?.trim() || decode(target.dataset.snippet || ""),
        source: ref?.metadata?.source || ref?.source || "知识库",
        chunkInfo: decode(target.dataset.chunk || ""),
        x: pos.x,
        y: pos.y,
      });
      setTooltip((prev) => ({ ...prev, visible: false }));
    };

    container.addEventListener("mouseover", onMouseOver);
    container.addEventListener("mouseout", onMouseOut);
    container.addEventListener("click", onClick);

    return () => {
      container.removeEventListener("mouseover", onMouseOver);
      container.removeEventListener("mouseout", onMouseOut);
      container.removeEventListener("click", onClick);
    };
  }, [citationEnhancedContent, references]);

  const handleSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const text = content.slice(start, end);
    if (start === end || !text) {
      onSelectionChange?.(null);
    } else {
      onSelectionChange?.({ text, start, end });
    }
  };

  return (
    <div className="relative h-full flex flex-col">
      <div className="border-b p-2 flex gap-2 bg-muted/20 items-center">
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setMode("preview")}
            className={`px-2 py-1 rounded ${
              mode === "preview"
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted"
            }`}
          >
            预览
          </button>
          <button
            onClick={() => setMode("edit")}
            className={`px-2 py-1 rounded ${
              mode === "edit" ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
          >
            编辑
          </button>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => onApply?.(content)}
          className="flex items-center gap-1 rounded bg-cyan-100 px-2 py-1 text-sm text-cyan-700 transition-colors hover:bg-cyan-200"
        >
          📝 应用到表单
        </button>
      </div>

      {/* Selection indicator bar - shows in both modes */}
      {highlightSelection?.text && (
        <div className="flex items-center justify-between gap-2 border-b border-amber-200 bg-amber-50/80 px-4 py-2 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-amber-800 dark:text-amber-200">
              ✎ 已选中 {highlightSelection.text.length} 字
            </span>
            <span className="text-amber-600 dark:text-amber-400">
              {mode === "edit"
                ? "切换到预览可查看高亮"
                : "打开 AI 助手输入修改要求"}
            </span>
          </div>
          <button
            onClick={() => onSelectionChange?.(null)}
            className="rounded px-2 py-0.5 text-xs text-amber-600 hover:bg-amber-200/50 hover:text-amber-800 dark:text-amber-400 dark:hover:bg-amber-800/50"
            type="button"
          >
            取消选中
          </button>
        </div>
      )}

      {mode === "edit" ? (
        <textarea
          value={content}
          onChange={(e) => onChange?.(e.target.value)}
          onSelect={handleSelection}
          onKeyUp={handleSelection}
          onClick={handleSelection}
          className="flex-1 w-full p-4 outline-none resize-none bg-background text-foreground"
          placeholder="在此编辑，支持 Markdown 语法..."
        />
      ) : (
        <div
          ref={markdownRef}
          className="flex-1 p-6 overflow-y-auto prose prose-slate dark:prose-invert max-w-none"
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            skipHtml={false}
          >
            {citationEnhancedContent ||
              "这里展示生成的陈述内容。左侧表单不会自动出现在此处，请点击上方「AI 生成陈述」生成，或切换到「编辑」手动撰写。"}
          </ReactMarkdown>
        </div>
      )}

      {/* Hover tooltip for citations */}
      {tooltip.visible && (
        <div
          className="fixed z-50 max-w-xs rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-xl shadow-slate-200/60 backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 dark:text-slate-100"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translateX(-50%)",
          }}
        >
          <div className="mb-1 font-semibold text-slate-800 dark:text-white">
            {tooltip.label}
          </div>
          {tooltip.snippet && (
            <div className="text-slate-600 dark:text-slate-200 leading-relaxed">
              {tooltip.snippet}
            </div>
          )}
        </div>
      )}
      {/* Click card for full reference */}
      {activeRef.visible && (
        <div
          className="fixed z-50 max-w-md rounded-2xl border border-slate-200 bg-white/98 px-4 py-3 text-sm shadow-2xl shadow-slate-200/70 ring-1 ring-slate-100/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-800/70"
          style={{
            left: activeRef.x,
            top: activeRef.y,
            transform: "translate(-50%, 8px)",
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                引用来源
              </div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {activeRef.label}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {activeRef.source}
                {activeRef.chunkInfo && ` · ${activeRef.chunkInfo}`}
              </div>
            </div>
            <button
              onClick={() =>
                setActiveRef((prev) => ({ ...prev, visible: false }))
              }
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              aria-label="关闭引用卡片"
            >
              ✕
            </button>
          </div>
          {activeRef.content && (
            <div className="mt-3 max-h-60 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-slate-700 ring-1 ring-slate-100 dark:bg-slate-800/70 dark:text-slate-100 dark:ring-slate-700/70">
              {activeRef.content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
