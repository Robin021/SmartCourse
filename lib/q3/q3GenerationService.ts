/**
 * Q3 Generation Service - 办学理念
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q3FormData,
    buildQ3GenerationInput,
    evaluatePositiveAlignment,
    extractQ3Keywords,
    normalizeQ3FormData,
} from "./q3FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q3GenerationRequest {
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

export interface Q3GenerationResult {
    report: string;
    keywords: string[];
    coreConcept: string;
    positive: boolean;
    suggestions: string[];
    ragResults: any[];
    webResults: any[];
    metadata: {
        promptUsed: string;
        tokenUsage: any;
        timestamp: Date;
    };
}

export class Q3GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    async generate(request: Q3GenerationRequest): Promise<Q3GenerationResult> {
        const {
            projectId,
            formData: rawFormData,
            conversationHistory,
            user,
            includeCitations,
            stream,
            onToken,
        } = request;
        const formData = normalizeQ3FormData(rawFormData);

        // Get previous context (Q1/Q2)
        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q3");
        const previousContextMap = this.toContextMap(previousContext);

        // Build generation input
        const generationInput = buildQ3GenerationInput(formData, previousContextMap);

        // Generate (streaming if requested)
        const generationResult = stream
            ? await GenerationService.generateStream(
                {
                    projectId,
                    stage: "Q3",
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
                stage: "Q3",
                userInput: generationInput,
                previousStagesContext: previousContextMap,
                conversationHistory,
                useRag: request.useRag ?? true,
                useWeb: request.useWeb ?? false,
                includeCitations: includeCitations ?? true,
            });

        // Validation & concept extraction
        const validation = this.contentValidator.validate(generationResult.content);
        const positiveCheck = evaluatePositiveAlignment(generationResult.content);
        const keywords = extractQ3Keywords(generationResult.content, formData);
        const coreConcept = formData.core_concept || (keywords[0] || "");

        // Persist
        await stageService.saveStageInput(projectId, "Q3", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q3",
            {
                report: generationResult.content,
                keywords,
                core_concept: coreConcept,
                positive: positiveCheck.isPositive,
                suggestions: [...validation.suggestions, ...positiveCheck.suggestions],
                rag_results: generationResult.ragResults,
                web_results: generationResult.webResults,
            },
            {
                overall: positiveCheck.isPositive ? 90 : 65,
                dimensions: { positive_alignment: positiveCheck.isPositive ? 1 : 0 },
            }
        );
        await stageService.completeStage(projectId, "Q3");

        await this.createVersion(projectId, generationResult, coreConcept, user);

        return {
            report: generationResult.content,
            keywords,
            coreConcept,
            positive: positiveCheck.isPositive,
            suggestions: [...validation.suggestions, ...positiveCheck.suggestions],
            ragResults: generationResult.ragResults,
            webResults: generationResult.webResults,
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
        coreConcept: string,
        user?: { id?: string; name?: string }
    ): Promise<void> {
        try {
            await createVersion({
                project_id: projectId,
                stage: "Q3",
                content: {
                    text: generationResult.content,
                    core_concept: coreConcept,
                    keywords: generationResult.keywords,
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
            console.error("[Q3GenerationService] Failed to create version:", error);
        }
    }
}

export const q3GenerationService = new Q3GenerationService();
export default Q3GenerationService;
