/**
 * Q8 Generation Service - 课程结构设计
 */

import { GenerationService } from "@/lib/generation";
import { stageService } from "@/lib/stage";
import { ContentValidator } from "@/lib/validation";
import {
    Q8FormData,
    buildQ8GenerationInput,
    computeStructureScore,
    extractQ8Keywords,
    normalizeQ8FormData,
} from "./q8FormConfig";
import { createVersion } from "@/models/StageVersion";

export interface Q8GenerationRequest {
    projectId: string;
    formData: Record<string, any>;
    conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
    user?: { id?: string; name?: string };
    useRag?: boolean;
    stream?: boolean;
    onToken?: (chunk: string) => void;
}

export interface Q8GenerationResult {
    report: string;
    keywords: string[];
    structureScore: { score: number; suggestions: string[] };
    ragResults: any[];
    validation: { isValid: boolean; suggestions: string[] };
    metadata: { promptUsed: string; tokenUsage: any; timestamp: Date };
}

export class Q8GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    async generate(request: Q8GenerationRequest): Promise<Q8GenerationResult> {
        const {
            projectId,
            formData: rawFormData,
            conversationHistory,
            user,
            stream,
            onToken,
        } = request;
        const formData = normalizeQ8FormData(rawFormData);

        const previousContext = await stageService.getPreviousStagesContext(projectId, "Q8");
        const previousContextMap = this.toContextMap(previousContext);

        const generationInput = buildQ8GenerationInput(formData, previousContextMap);
        const generationResult = stream
            ? await GenerationService.generateStream(
                  {
                      projectId,
                      stage: "Q8",
                      userInput: generationInput,
                      previousStagesContext: previousContextMap,
                      conversationHistory,
                      useRag: request.useRag ?? true,
                  },
                  { onToken }
              )
            : await GenerationService.generate({
                  projectId,
                  stage: "Q8",
                  userInput: generationInput,
                  previousStagesContext: previousContextMap,
                  conversationHistory,
                  useRag: request.useRag ?? true,
              });

        const structureScore = computeStructureScore(formData, generationResult.ragResults.length);
        const keywords = extractQ8Keywords(generationResult.content, formData);
        const validation = this.contentValidator.validate(generationResult.content);

        await stageService.saveStageInput(projectId, "Q8", formData);
        await stageService.saveStageOutput(
            projectId,
            "Q8",
            {
                report: generationResult.content,
                keywords,
                structureScore,
                rag_results: generationResult.ragResults,
            },
            {
                overall: structureScore.score,
                dimensions: { structure: structureScore.score },
            }
        );
        await stageService.completeStage(projectId, "Q8");

        await this.createVersion(projectId, generationResult, structureScore.score, user);

        return {
            report: generationResult.content,
            keywords,
            structureScore,
            ragResults: generationResult.ragResults,
            validation: {
                isValid: validation.isValid,
                suggestions: [...validation.suggestions, ...structureScore.suggestions],
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
                stage: "Q8",
                content: {
                    text: generationResult.content,
                    keywords: generationResult.keywords,
                    structure_score: score,
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
            console.error("[Q8GenerationService] Failed to create version:", error);
        }
    }
}

export const q8GenerationService = new Q8GenerationService();
export default Q8GenerationService;
