/**
 * Q7 Generation Service - 课程目标细化
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q7FormData,
    buildQ7GenerationInput,
    computeGapAnalysis,
    extractQ7Keywords,
    normalizeQ7FormData,
} from "./q7FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q7GenerationRequest {
    projectId: string;
    formData: Record<string, any>;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    user?: { id?: string; name?: string };
    useRag?: boolean;
}

export interface Q7GenerationResult {
    report: string;
    keywords: string[];
    gapAnalysis: {
        score: number;
        dimensions: Record<string, number>;
        suggestions: string[];
    };
    ragResults: any[];
    validation: { isValid: boolean; suggestions: string[] };
    metadata: { promptUsed: string; tokenUsage: any; timestamp: Date };
}

export class Q7GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    async generate(request: Q7GenerationRequest): Promise<Q7GenerationResult> {
        const { projectId, formData: rawFormData, conversationHistory, user } = request;
        const formData = normalizeQ7FormData(rawFormData);

        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q7");
        const previousContextMap = this.toContextMap(previousContext);

        const gapAnalysis = computeGapAnalysis(formData);

        const generationInput = buildQ7GenerationInput(formData, previousContextMap);
        const generationResult = await GenerationService.generate({
            projectId,
            stage: "Q7",
            userInput: generationInput,
            previousStagesContext: previousContextMap,
            conversationHistory,
            useRag: request.useRag ?? true,
        });

        const keywords = extractQ7Keywords(generationResult.content, formData);
        const validation = this.contentValidator.validate(generationResult.content);

        await stageService.saveStageInput(projectId, "Q7", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q7",
            {
                report: generationResult.content,
                keywords,
                gapAnalysis,
                rag_results: generationResult.ragResults,
            },
            {
                overall: gapAnalysis.score,
                dimensions: gapAnalysis.dimensions,
            }
        );
        await stageService.completeStage(projectId, "Q7");

        await this.createVersion(projectId, generationResult, gapAnalysis.score, user);

        return {
            report: generationResult.content,
            keywords,
            gapAnalysis,
            ragResults: generationResult.ragResults,
            validation: {
                isValid: validation.isValid,
                suggestions: [...validation.suggestions, ...gapAnalysis.suggestions],
            },
            metadata: {
                promptUsed: generationResult.metadata.promptUsed,
                tokenUsage: generationResult.usage,
                timestamp: generationResult.metadata.timestamp,
            },
        };
    }

    private toContextMap(previousContext: Array<{ stage: string; output: Record<string, any> }>): Record<string, any> {
        return previousContext.reduce((acc, item) => {
            acc[item.stage] = item.output;
            acc[`${item.stage}_output`] = item.output;
            return acc;
        }, {} as Record<string, any>);
    }

    private async createVersion(
        projectId: string,
        generationResult: any,
        score: number,
        user?: { id?: string; name?: string }
    ): Promise<void> {
        try {
            await createVersion({
                project_id: projectId,
                stage: "Q7",
                content: {
                    text: generationResult.content,
                    keywords: generationResult.keywords,
                    gap_score: score,
                },
                author: {
                    user_id: user?.id || "system",
                    name: user?.name || "AI Generation",
                },
                is_ai_generated: true,
                generation_metadata: {
                    prompt_used: generationResult.metadata.promptUsed,
                    rag_results: generationResult.ragResults,
                    token_usage: generationResult.usage,
                },
            });
        } catch (error) {
            console.error("[Q7GenerationService] Failed to create version:", error);
        }
    }
}

export const q7GenerationService = new Q7GenerationService();
export default Q7GenerationService;
