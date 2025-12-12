/**
 * Q2 Generation Service - 教育哲学
 *
 * Implements Q2 stage generation: combines user inputs, RAG, and previous stage
 * context to produce核心关键词、在地化哲学主张和《教育哲学陈述报告》。
 *
 * Requirements covered: 2.3, 2.4, 2.5, 2.6, 2.7
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q2FormData,
    buildQ2GenerationInput,
    computeTheoryFitScore,
    extractQ2Keywords,
    normalizeQ2FormData,
} from "./q2FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q2GenerationRequest {
    projectId: string;
    formData: Record<string, any>;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    user?: { id?: string; name?: string };
    useRag?: boolean;
    stream?: boolean;
    onToken?: (chunk: string) => void;
}

export interface Q2GenerationResult {
    report: string;
    keywords: string[];
    theoryFitScore: number;
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

export class Q2GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    /**
     * Generate Q2 教育哲学陈述
     */
    async generate(request: Q2GenerationRequest): Promise<Q2GenerationResult> {
        const {
            projectId,
            formData: rawFormData,
            conversationHistory,
            user,
            useRag,
            stream,
            onToken,
        } = request;
        const formData = normalizeQ2FormData(rawFormData);

        // 1) Gather previous stage (Q1) context
        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q2");
        const previousContextMap = this.toContextMap(previousContext);

        // 2) Build generation input
        const generationInput = buildQ2GenerationInput(formData, previousContextMap);

        // 3) Call shared GenerationService
        const generationResult = stream
            ? await GenerationService.generateStream(
                  {
                      projectId,
                      stage: "Q2",
                      userInput: generationInput,
                      previousStagesContext: previousContextMap,
                      conversationHistory,
                      useRag: useRag ?? true,
                  },
                  { onToken }
              )
            : await GenerationService.generate({
                  projectId,
                  stage: "Q2",
                  userInput: generationInput,
                  previousStagesContext: previousContextMap,
                  conversationHistory,
                  useRag: useRag ?? true,
              });

        // 4) Evaluate and enrich results
        const theoryFitScore = computeTheoryFitScore(formData, generationResult.ragResults.length);
        const keywords = extractQ2Keywords(generationResult.content, formData);
        const validation = this.contentValidator.validate(generationResult.content);

        // 5) Persist input/output and progress
        await stageService.saveStageInput(projectId, "Q2", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q2",
            {
                report: generationResult.content,
                keywords,
                theory_fit_score: theoryFitScore,
                selected_theories: formData.selected_theories,
                custom_theories: formData.custom_theories,
                era_spirit: formData.era_spirit,
                regional_culture: formData.regional_culture,
                school_profile: formData.school_profile,
                rag_results: generationResult.ragResults,
            },
            {
                overall: theoryFitScore,
                dimensions: { theory_fit: theoryFitScore },
            }
        );
        await stageService.completeStage(projectId, "Q2");

        // 6) Versioning
        await this.createVersion(
            projectId,
            generationResult,
            theoryFitScore,
            keywords,
            user
        );

        return {
            report: generationResult.content,
            keywords,
            theoryFitScore,
            ragResults: generationResult.ragResults,
            validation,
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
        theoryFitScore: number,
        keywords: string[],
        user?: { id?: string; name?: string }
    ): Promise<void> {
        try {
            await createVersion({
                project_id: projectId,
                stage: "Q2",
                content: {
                    text: generationResult.content,
                    keywords,
                    theory_fit_score: theoryFitScore,
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
            console.error("[Q2GenerationService] Failed to create version:", error);
        }
    }
}

export const q2GenerationService = new Q2GenerationService();
export default Q2GenerationService;
