/**
 * Q10 Generation Service - 课程评价体系
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q10FormData,
    buildQ10GenerationInput,
    computeEvaluationScore,
    extractQ10Keywords,
    normalizeQ10FormData,
} from "./q10FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q10GenerationRequest {
    projectId: string;
    formData: Record<string, any>;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    user?: { id?: string; name?: string };
    useRag?: boolean;
    stream?: boolean;
    onToken?: (chunk: string) => void;
}

export interface Q10GenerationResult {
    report: string;
    keywords: string[];
    evaluationScore: { score: number; suggestions: string[] };
    ragResults: any[];
    validation: { isValid: boolean; suggestions: string[] };
    metadata: { promptUsed: string; tokenUsage: any; timestamp: Date };
}

export class Q10GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    async generate(request: Q10GenerationRequest): Promise<Q10GenerationResult> {
        const {
            projectId,
            formData: rawFormData,
            conversationHistory,
            user,
            stream,
            onToken,
        } = request;
        const formData = normalizeQ10FormData(rawFormData);

        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q10");
        const previousContextMap = this.toContextMap(previousContext);

        const generationInput = buildQ10GenerationInput(formData, previousContextMap);
        const generationResult = stream
            ? await GenerationService.generateStream(
                  {
                      projectId,
                      stage: "Q10",
                      userInput: generationInput,
                      previousStagesContext: previousContextMap,
                      conversationHistory,
                      useRag: request.useRag ?? true,
                  },
                  { onToken }
              )
            : await GenerationService.generate({
                  projectId,
                  stage: "Q10",
                  userInput: generationInput,
                  previousStagesContext: previousContextMap,
                  conversationHistory,
                  useRag: request.useRag ?? true,
              });

        const evaluationScore = computeEvaluationScore(formData, generationResult.ragResults.length);
        const keywords = extractQ10Keywords(generationResult.content, formData);
        const validation = this.contentValidator.validate(generationResult.content);

        await stageService.saveStageInput(projectId, "Q10", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q10",
            {
                report: generationResult.content,
                keywords,
                evaluationScore,
                rag_results: generationResult.ragResults,
            },
            {
                overall: evaluationScore.score,
                dimensions: { evaluation: evaluationScore.score },
            }
        );
        await stageService.completeStage(projectId, "Q10");

        await this.createVersion(projectId, generationResult, evaluationScore.score, user);

        return {
            report: generationResult.content,
            keywords,
            evaluationScore,
            ragResults: generationResult.ragResults,
            validation: {
                isValid: validation.isValid,
                suggestions: [...validation.suggestions, ...evaluationScore.suggestions],
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
                stage: "Q10",
                content: {
                    text: generationResult.content,
                    keywords: generationResult.keywords,
                    evaluation_score: score,
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
            console.error("[Q10GenerationService] Failed to create version:", error);
        }
    }
}

export const q10GenerationService = new Q10GenerationService();
export default Q10GenerationService;
