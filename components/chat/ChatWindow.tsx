"use client";

import { useEffect, useState } from "react";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import { X } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  projectId: string;
  stageId?: string;
  contextInput?: Record<string, any>;
  contextOutput?: string;
  selectedText?: string;
  onApplyContent?: (content: string) => void;
  onApplySelection?: (content: string) => void;
  onClose?: () => void;
}

export default function ChatWindow({
  projectId,
  stageId,
  contextInput,
  contextOutput,
  selectedText,
  onApplyContent,
  onApplySelection,
  onClose,
}: ChatWindowProps) {
  // Heuristically extract the part of an assistant reply that should replace a selection.
  // LLMs sometimes prepend polite acknowledgements; this trims to the most useful snippet.
  const extractContentForSelection = (raw: string) => {
    const text = (raw || "").trim();
    if (!text) return "";

    // Prefer explicit JSON { replacement, notes }
    const tryParseJson = (payload: string) => {
      try {
        const parsed = JSON.parse(payload);
        if (
          parsed &&
          typeof parsed === "object" &&
          typeof parsed.replacement === "string"
        ) {
          return parsed.replacement.trim();
        }
      } catch {
        return null;
      }
      return null;
    };

    // Try fenced code JSON first
    const fencedJson = [...text.matchAll(/```(?:json)?\n([\s\S]*?)```/gi)];
    if (fencedJson.length > 0) {
      const parsed = tryParseJson(fencedJson[fencedJson.length - 1][1]);
      if (parsed) return parsed;
    }
    const directJson = tryParseJson(text);
    if (directJson) return directJson;

    // XML-style markers
    const replacementMatch = text.match(
      /<replacement>([\s\S]*?)<\/replacement>/i
    );
    if (replacementMatch) {
      return replacementMatch[1].trim();
    }

    // Prefer the last fenced code block if present.
    const codeBlocks = [...text.matchAll(/```(?:\w+)?\n([\s\S]*?)```/g)];
    if (codeBlocks.length > 0) {
      return codeBlocks[codeBlocks.length - 1][1].trim();
    }

    // If the reply includes a marker like "修改后的片段", keep everything after it.
    const markerMatch =
      /(?:修改后的片段|更新后的片段|替换后的内容|调整后的内容|修订后的文本|修改后)[:：]?\s*/i.exec(
        text
      );
    if (markerMatch) {
      const sliced = text
        .slice(markerMatch.index + markerMatch[0].length)
        .trim();
      if (sliced) return sliced;
    }

    // Drop common polite lead-ins when there are multiple paragraphs.
    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paragraphs.length > 1) {
      const first = paragraphs[0];
      if (
        /^(好的|好滴|我理解|理解了|收到|明白|以下是|这里是|下面是)/i.test(first)
      ) {
        return paragraphs.slice(1).join("\n\n").trim();
      }
    }

    return text;
  };

  // Lightly sanitize assistant replies for display: drop boilerplate lead-ins and footer noise.
  // But preserve JSON responses (for selection replacement feature).
  const sanitizeAssistantMessage = (raw: string) => {
    let text = (raw || "").trim();
    if (!text) return text;

    // Check if this is a JSON response (for selection replacement)
    // If so, just return the replacement content directly
    try {
      const parsed = JSON.parse(text);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.replacement === "string"
      ) {
        // Just return the replacement content, no extra formatting
        return parsed.replacement.trim();
      }
    } catch {
      // Not JSON, continue with normal sanitization
    }

    // Remove footer noise / meta hints (but NOT JSON with replacement)
    const filteredLines = text
      .split("\n")
      .map((l) => l.trimEnd())
      .filter(
        (l) =>
          l &&
          !/^备注[:：]/i.test(l) &&
          !/^结构化输出|^已提取 replacement/i.test(l)
      );
    text = filteredLines.join("\n").trim();
    if (!text) return "";

    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (paragraphs.length > 1) {
      const first = paragraphs[0];
      if (
        /^(好的|好滴|我理解|理解了|收到|明白|作为|根据|基于|以下是|这里是|下面是)/i.test(
          first
        )
      ) {
        return paragraphs.slice(1).join("\n\n").trim();
      }
    }

    return text;
  };

  const initialMessage: Message = {
    id: "welcome",
    role: "assistant",
    content:
      "Hello! I'm your AI assistant. How can I help you with this project?",
  };
  const [messages, setMessages] = useState<Message[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const scrollToBottom = () => {
    const el = document.getElementById("chat-scroll-anchor");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const loadConversation = async () => {
      try {
        const url = stageId
          ? `/api/project/${projectId}/chat?stage=${stageId}`
          : `/api/project/${projectId}/chat`;
        const res = await fetch(url);
        const data = await res.json();
        if (
          data.success &&
          Array.isArray(data.messages) &&
          data.messages.length > 0
        ) {
          setMessages(
            data.messages.map((m: any, idx: number) => ({
              id: `${m.timestamp || idx}-${idx}`,
              role: m.role,
              content: m.content,
            }))
          );
        }
      } catch (error) {
        console.warn("Load conversation failed", error);
      }
    };

    loadConversation();
  }, [projectId, stageId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
    };
  }, [abortController]);

  const handleSend = async (content: string) => {
    // Create new AbortController for this request
    const controller = new AbortController();
    setAbortController(controller);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const historyToSend = [...messages, userMessage];
      const res = await fetch("/api/chat?stream=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          stageId,
          message: content,
          history: historyToSend,
          contextInput,
          contextOutput,
          contextSelection: selectedText,
        }),
        signal: controller.signal,
      });

      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get response");
      }

      if (!res.body) {
        const data = await res.json();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: sanitizeAssistantMessage(data.response) }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        // Check if aborted
        if (controller.signal.aborted) {
          console.log("[Chat] Aborted by user");
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
        );
      }
      acc += decoder.decode();
      const finalContent = sanitizeAssistantMessage(acc);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: finalContent } : m
        )
      );
    } catch (error: any) {
      // Check if error is due to abort
      if (error.name === "AbortError" || controller.signal.aborted) {
        console.log("[Chat] Aborted by user");
        // Keep the partial content if any
      } else {
        console.error("Chat error:", error);
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "assistant",
            content: "对话失败，请稍后重试。",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStop = () => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleApply = (content: string) => {
    if (selectedText && onApplySelection) {
      onApplySelection(extractContentForSelection(content));
    } else {
      onApplyContent?.(content);
    }
  };

  return (
    <div className="flex h-[520px] max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            AI 助手
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {stageId && <span>当前阶段：{stageId}</span>}
            {selectedText && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 border border-amber-200">
                已选中 {selectedText.length} 字，将只修改这段
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              setMessages([initialMessage]);
              try {
                await fetch(`/api/project/${projectId}/chat`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    stageId,
                    messages: [],
                  }),
                });
              } catch (error) {
                console.warn("Clear conversation failed", error);
              }
            }}
            className="rounded px-2 py-1 text-xs text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            清空
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="关闭助手"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <MessageList
        messages={messages}
        onApplyContent={handleApply}
        applyLabel={selectedText ? "替换选中内容" : "应用到正文"}
      />
      <div id="chat-scroll-anchor" />
      <MessageInput
        onSend={handleSend}
        isLoading={isLoading}
        onStop={isLoading ? handleStop : undefined}
      />
    </div>
  );
}
