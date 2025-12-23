"use client";

import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidProps {
    chart: string;
}

mermaid.initialize({
    startOnLoad: false,
    theme: "default",
    securityLevel: "loose",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
});

export default function Mermaid({ chart }: MermaidProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [svg, setSvg] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (chart && ref.current) {
            const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
            mermaid
                .render(id, chart)
                .then(({ svg }) => {
                    setSvg(svg);
                    setError(null);
                })
                .catch((err) => {
                    console.error("Mermaid render error:", err);
                    setError("Failed to render diagram");
                    // Mermaid retains error text in the DOM, so we might need cleanup if we want custom error UI
                });
        }
    }, [chart]);

    if (error) {
        return (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
                <p className="font-semibold">Diagram Error:</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                    {error}
                </pre>
                <pre className="mt-4 border-t border-red-200 pt-4 font-mono text-xs text-zinc-500">
                    {chart}
                </pre>
            </div>
        );
    }

    return (
        <div
            ref={ref}
            className="mermaid my-4 flex justify-center overflow-x-auto rounded-lg border border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
