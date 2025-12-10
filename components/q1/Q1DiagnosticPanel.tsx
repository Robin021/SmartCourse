"use client";

import { SWOTDimensionScores, SWOTAnalysisResult } from "@/lib/q1/swotAnalysis";

interface Q1DiagnosticPanelProps {
    swotAnalysis?: SWOTAnalysisResult;
    isLoading?: boolean;
}

/**
 * Q1 Diagnostic Panel Component
 * 
 * Displays SWOT analysis scores and recommendations.
 * Based on Requirements 1.4 - SWOT量化评分
 */
export function Q1DiagnosticPanel({
    swotAnalysis,
    isLoading = false,
}: Q1DiagnosticPanelProps) {
    if (isLoading) {
        return (
            <div className="p-4 bg-muted/20 rounded-lg animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
                <div className="space-y-3">
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
                    <div className="h-8 bg-muted rounded"></div>
                </div>
            </div>
        );
    }

    if (!swotAnalysis) {
        return (
            <div className="p-4 bg-muted/20 rounded-lg text-center text-muted-foreground">
                <p>完成SWOT分析后将显示诊断评分</p>
            </div>
        );
    }

    const { dimensionScores, overallScore, analysis, isValid, validationErrors } = swotAnalysis;

    return (
        <div className="space-y-4">
            {/* Overall Score */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">综合评分</span>
                    <span className="text-2xl font-bold text-primary">
                        {overallScore}
                    </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                    <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${overallScore}%` }}
                    />
                </div>
            </div>

            {/* Dimension Scores */}
            <div className="grid grid-cols-2 gap-3">
                <ScoreCard
                    label="优势"
                    score={dimensionScores.strengths}
                    color="green"
                    icon="💪"
                />
                <ScoreCard
                    label="劣势"
                    score={dimensionScores.weaknesses}
                    color="red"
                    icon="⚠️"
                    inverted
                />
                <ScoreCard
                    label="机会"
                    score={dimensionScores.opportunities}
                    color="blue"
                    icon="🎯"
                />
                <ScoreCard
                    label="威胁"
                    score={dimensionScores.threats}
                    color="orange"
                    icon="🔥"
                    inverted
                />
            </div>

            {/* Analysis Insights */}
            {(analysis.strongestAreas.length > 0 || 
              analysis.areasForImprovement.length > 0 ||
              analysis.strategicRecommendations.length > 0) && (
                <div className="space-y-3">
                    {analysis.strongestAreas.length > 0 && (
                        <InsightSection
                            title="优势领域"
                            items={analysis.strongestAreas}
                            icon="✅"
                            color="green"
                        />
                    )}
                    
                    {analysis.areasForImprovement.length > 0 && (
                        <InsightSection
                            title="改进领域"
                            items={analysis.areasForImprovement}
                            icon="📝"
                            color="orange"
                        />
                    )}
                    
                    {analysis.strategicRecommendations.length > 0 && (
                        <InsightSection
                            title="战略建议"
                            items={analysis.strategicRecommendations}
                            icon="💡"
                            color="blue"
                        />
                    )}
                </div>
            )}

            {/* Validation Status */}
            {!isValid && validationErrors.length > 0 && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">
                        ⚠️ 数据验证问题
                    </p>
                    <ul className="text-xs text-red-600 dark:text-red-300 space-y-1">
                        {validationErrors.slice(0, 5).map((error, i) => (
                            <li key={i}>• {error}</li>
                        ))}
                        {validationErrors.length > 5 && (
                            <li>...还有 {validationErrors.length - 5} 个问题</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}

// Score Card Component
function ScoreCard({
    label,
    score,
    color,
    icon,
    inverted = false,
}: {
    label: string;
    score: number;
    color: "green" | "red" | "blue" | "orange";
    icon: string;
    inverted?: boolean;
}) {
    const colorClasses = {
        green: "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800",
        red: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
        blue: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
        orange: "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800",
    };

    const barColors = {
        green: "bg-green-500",
        red: "bg-red-500",
        blue: "bg-blue-500",
        orange: "bg-orange-500",
    };

    // For inverted scores (weaknesses, threats), lower is better
    const displayScore = inverted ? 100 - score : score;
    const interpretation = inverted
        ? score <= 40 ? "良好" : score <= 70 ? "需关注" : "需改进"
        : score >= 70 ? "良好" : score >= 40 ? "一般" : "需加强";

    return (
        <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium flex items-center gap-1">
                    <span>{icon}</span>
                    {label}
                </span>
                <span className="text-lg font-bold">{score}</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1.5 mb-1">
                <div
                    className={`${barColors[color]} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${score}%` }}
                />
            </div>
            <p className="text-[10px] text-muted-foreground text-right">
                {interpretation}
            </p>
        </div>
    );
}

// Insight Section Component
function InsightSection({
    title,
    items,
    icon,
    color,
}: {
    title: string;
    items: string[];
    icon: string;
    color: "green" | "orange" | "blue";
}) {
    const bgColors = {
        green: "bg-green-50/50 dark:bg-green-950/10",
        orange: "bg-orange-50/50 dark:bg-orange-950/10",
        blue: "bg-blue-50/50 dark:bg-blue-950/10",
    };

    return (
        <div className={`p-3 rounded-lg ${bgColors[color]}`}>
            <p className="text-xs font-medium mb-2 flex items-center gap-1">
                <span>{icon}</span>
                {title}
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
                {items.map((item, i) => (
                    <li key={i}>• {item}</li>
                ))}
            </ul>
        </div>
    );
}

export default Q1DiagnosticPanel;
