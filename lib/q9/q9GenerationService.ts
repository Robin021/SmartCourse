/**
 * Q9 Generation Service - 课程实施方案
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q9FormData,
    buildQ9GenerationInput,
    computeFeasibilityScore,
    extractQ9Keywords,
    normalizeQ9FormData,
} from "./q9FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q9GenerationRequest {
    projectId: string;
    formData: Record<string, any>;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    user?: { id?: string; name?: string };
    useRag?: boolean;
}

export interface Q9GenerationResult {
    report: string;
    keywords: string[];
    feasibility: { score: number; suggestions: string[] };
    ragResults: any[];
    validation: { isValid: boolean; suggestions: string[] };
    metadata: { promptUsed: string; tokenUsage: any; timestamp: Date };
}

export class Q9GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    async generate(request: Q9GenerationRequest): Promise<Q9GenerationResult> {
        const { projectId, formData: rawFormData, conversationHistory, user } = request;
        const formData = normalizeQ9FormData(rawFormData);

        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q9");
        const previousContextMap = this.toContextMap(previousContext);

        const generationInput = buildQ9GenerationInput(formData, previousContextMap);
        const generationResult = await GenerationService.generate({
            projectId,
            stage: "Q9",
            userInput: generationInput,
            previousStagesContext: previousContextMap,
            conversationHistory,
            useRag: request.useRag ?? true,
        });

        const feasibility = computeFeasibilityScore(formData, generationResult.ragResults.length);
        const keywords = extractQ9Keywords(generationResult.content, formData);
        const validation = this.contentValidator.validate(generationResult.content);

        await stageService.saveStageInput(projectId, "Q9", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q9",
            {
                report: generationResult.content,
                keywords,
                feasibility,
                rag_results: generationResult.ragResults,
            },
            {
                overall: feasibility.score,
                dimensions: { feasibility: feasibility.score },
            }
        );
        await stageService.completeStage(projectId, "Q9");

        await this.createVersion(projectId, generationResult, feasibility.score, user);

        return {
            report: generationResult.content,
            keywords,
            feasibility,
            ragResults: generationResult.ragResults,
            validation: {
                isValid: validation.isValid,
                suggestions: [...validation.suggestions, ...feasibility.suggestions],
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
                stage: "Q9",
                content: {
                    text: generationResult.content,
                    keywords: generationResult.keywords,
                    feasibility_score: score,
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
            console.error("[Q9GenerationService] Failed to create version:", error);
        }
    }
}

export const q9GenerationService = new Q9GenerationService();
export default Q9GenerationService;
