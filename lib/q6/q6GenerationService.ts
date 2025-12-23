/**
 * Q6 Generation Service - 课程理念陈述
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q6FormData,
    buildQ6GenerationInput,
    computeValueConsistencyScore,
    extractQ6Keywords,
    normalizeQ6FormData,
} from "./q6FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q6GenerationRequest {
    projectId: string;
    formData: Record<string, any>;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    user?: { id?: string; name?: string };
    useRag?: boolean;
    useWeb?: boolean;
    includeCitations?: boolean;  // Whether to include citations in output
    stream?: boolean;
    onToken?: (chunk: string) => void;
}

export interface Q6GenerationResult {
    report: string;
    keywords: string[];
    consistency: { score: number; suggestions: string[] };
    ragResults: any[];
    webResults: any[];
    validation: { isValid: boolean; suggestions: string[] };
    metadata: { promptUsed: string; tokenUsage: any; timestamp: Date };
}

export class Q6GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    async generate(request: Q6GenerationRequest): Promise<Q6GenerationResult> {
        const {
            projectId,
            formData: rawFormData,
            conversationHistory,
            user,
            includeCitations,
            stream,
            onToken,
        } = request;
        const formData = normalizeQ6FormData(rawFormData);

        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q6");
        const previousContextMap = this.toContextMap(previousContext);

        const generationInput = buildQ6GenerationInput(formData, previousContextMap);
        const generationResult = stream
            ? await GenerationService.generateStream(
                {
                    projectId,
                    stage: "Q6",
                    userInput: generationInput,
                    previousStagesContext: previousContextMap,
                    conversationHistory,
                    useRag: request.useRag ?? true,
                    useWeb: request.useWeb ?? false,
                    includeCitations: includeCitations ?? true,
                },
                { onToken }
            )
            : await GenerationService.generate({
                projectId,
                stage: "Q6",
                userInput: generationInput,
                previousStagesContext: previousContextMap,
                conversationHistory,
                useRag: request.useRag ?? true,
                useWeb: request.useWeb ?? false,
                includeCitations: includeCitations ?? true,
            });

        const consistency = computeValueConsistencyScore(formData, generationResult.ragResults.length);
        const keywords = extractQ6Keywords(generationResult.content, formData);
        const validation = this.contentValidator.validate(generationResult.content);

        await stageService.saveStageInput(projectId, "Q6", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q6",
            {
                report: generationResult.content,
                keywords,
                consistency,
                rag_results: generationResult.ragResults,
                web_results: generationResult.webResults,
            },
            {
                overall: consistency.score,
                dimensions: { value_consistency: consistency.score },
            }
        );
        await stageService.completeStage(projectId, "Q6");

        await this.createVersion(projectId, generationResult, consistency.score, user);

        return {
            report: generationResult.content,
            keywords,
            consistency,
            ragResults: generationResult.ragResults,
            webResults: generationResult.webResults,
            validation: {
                isValid: validation.isValid,
                suggestions: [...validation.suggestions, ...consistency.suggestions],
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
                stage: "Q6",
                content: {
                    text: generationResult.content,
                    keywords: generationResult.keywords,
                    consistency_score: score,
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
            console.error("[Q6GenerationService] Failed to create version:", error);
        }
    }
}

export const q6GenerationService = new Q6GenerationService();
export default Q6GenerationService;
