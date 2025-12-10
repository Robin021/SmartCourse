/**
 * Q4 Generation Service - 育人目标
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q4FormData,
    buildQ4GenerationInput,
    computeFiveVirtuesCoverage,
    extractQ4Keywords,
    normalizeQ4FormData,
} from "./q4FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q4GenerationRequest {
    projectId: string;
    formData: Record<string, any>;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    user?: { id?: string; name?: string };
    useRag?: boolean;
}

export interface Q4GenerationResult {
    report: string;
    keywords: string[];
    coverage: {
        overall: number;
        dimensions: Record<string, number>;
        suggestions: string[];
    };
    ragResults: any[];
    validation: {
        isValid: boolean;
        suggestions: string[];
    };
    metadata: {
        promptUsed: string;
        tokenUsage: any;
        timestamp: Date;
    };
}

export class Q4GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    async generate(request: Q4GenerationRequest): Promise<Q4GenerationResult> {
        const { projectId, formData: rawFormData, conversationHistory, user } = request;
        const formData = normalizeQ4FormData(rawFormData);

        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q4");
        const previousContextMap = this.toContextMap(previousContext);

        const coverage = computeFiveVirtuesCoverage(formData.five_virtues_priority);

        const generationInput = buildQ4GenerationInput(formData, previousContextMap);
        const generationResult = await GenerationService.generate({
            projectId,
            stage: "Q4",
            userInput: generationInput,
            previousStagesContext: previousContextMap,
            conversationHistory,
            useRag: request.useRag ?? true,
        });

        const keywords = extractQ4Keywords(generationResult.content, formData);
        const validation = this.contentValidator.validate(generationResult.content);

        await stageService.saveStageInput(projectId, "Q4", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q4",
            {
                report: generationResult.content,
                keywords,
                coverage,
                rag_results: generationResult.ragResults,
            },
            {
                overall: coverage.overall,
                dimensions: coverage.dimensions,
            }
        );
        await stageService.completeStage(projectId, "Q4");

        await this.createVersion(projectId, generationResult, coverage, user);

        return {
            report: generationResult.content,
            keywords,
            coverage,
            ragResults: generationResult.ragResults,
            validation: {
                isValid: validation.isValid,
                suggestions: [...validation.suggestions, ...coverage.suggestions],
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
        coverage: { overall: number; dimensions: Record<string, number> },
        user?: { id?: string; name?: string }
    ): Promise<void> {
        try {
            await createVersion({
                project_id: projectId,
                stage: "Q4",
                content: {
                    text: generationResult.content,
                    keywords: generationResult.keywords,
                    coverage,
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
            console.error("[Q4GenerationService] Failed to create version:", error);
        }
    }
}

export const q4GenerationService = new Q4GenerationService();
export default Q4GenerationService;
