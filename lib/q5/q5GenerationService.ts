/**
 * Q5 Generation Service - 课程模式命名
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q5FormData,
    buildQ5GenerationInput,
    computeNameSuitability,
    extractQ5Keywords,
    normalizeQ5FormData,
} from "./q5FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q5GenerationRequest {
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

export interface Q5GenerationResult {
    report: string;
    keywords: string[];
    nameSuggestion: string;
    tagline: string;
    suitability: { score: number; suggestions: string[] };
    ragResults: any[];
    webResults: any[];
    validation: { isValid: boolean; suggestions: string[] };
    metadata: { promptUsed: string; tokenUsage: any; timestamp: Date };
}

export class Q5GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    async generate(request: Q5GenerationRequest): Promise<Q5GenerationResult> {
        const {
            projectId,
            formData: rawFormData,
            conversationHistory,
            user,
            includeCitations,
            stream,
            onToken,
        } = request;
        const formData = normalizeQ5FormData(rawFormData);

        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q5");
        const previousContextMap = this.toContextMap(previousContext);

        const generationInput = buildQ5GenerationInput(formData, previousContextMap);
        const generationResult = stream
            ? await GenerationService.generateStream(
                {
                    projectId,
                    stage: "Q5",
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
                stage: "Q5",
                userInput: generationInput,
                previousStagesContext: previousContextMap,
                conversationHistory,
                useRag: request.useRag ?? true,
                useWeb: request.useWeb ?? false,
                includeCitations: includeCitations ?? true,
            });

        const suitability = computeNameSuitability(formData, generationResult.ragResults.length);
        const keywords = extractQ5Keywords(generationResult.content, formData);
        const validation = this.contentValidator.validate(generationResult.content);

        // Simple heuristic to pick primary name/tagline from content
        const lines = generationResult.content.split("\n").map((l) => l.trim()).filter(Boolean);
        const nameSuggestion = formData.custom_name || lines[0] || "";
        const tagline = formData.custom_tagline || (lines.find((l) => l.length <= 20 && l.length >= 6) || "");

        await stageService.saveStageInput(projectId, "Q5", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q5",
            {
                report: generationResult.content,
                keywords,
                name_suggestion: nameSuggestion,
                tagline,
                suitability,
                rag_results: generationResult.ragResults,
                web_results: generationResult.webResults,
            },
            {
                overall: suitability.score,
                dimensions: { suitability: suitability.score },
            }
        );
        await stageService.completeStage(projectId, "Q5");

        await this.createVersion(projectId, generationResult, nameSuggestion, tagline, suitability.score, user);

        return {
            report: generationResult.content,
            keywords,
            nameSuggestion,
            tagline,
            suitability,
            ragResults: generationResult.ragResults,
            webResults: generationResult.webResults,
            validation: {
                isValid: validation.isValid,
                suggestions: [...validation.suggestions, ...suitability.suggestions],
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
        nameSuggestion: string,
        tagline: string,
        score: number,
        user?: { id?: string; name?: string }
    ): Promise<void> {
        try {
            await createVersion({
                project_id: projectId,
                stage: "Q5",
                content: {
                    text: generationResult.content,
                    name_suggestion: nameSuggestion,
                    tagline,
                    suitability_score: score,
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
            console.error("[Q5GenerationService] Failed to create version:", error);
        }
    }
}

export const q5GenerationService = new Q5GenerationService();
export default Q5GenerationService;
