/**
 * Q1 Generation Service
 * 
 * Handles AI generation for Q1 stage (学校课程情境分析).
 * Integrates RAG retrieval, SWOT analysis, and content generation.
 * 
 * Based on Requirements 1.3, 1.4, 1.7
 */

import { GenerationService, GenerationResult } from '@/lib/generation';
import { stageService } from '@/lib/stage';
import { ContentValidator } from '@/lib/validation';
import { createVersion } from '@/models/StageVersion';
import {
    SWOTInput,
    SWOTAnalysisResult,
    analyzeSWOT,
    validateQ1Content,
} from './swotAnalysis';
import { formDataToSWOTInput } from './q1FormConfig';

// ============================================================================
// Types
// ============================================================================

export interface Q1GenerationRequest {
    projectId: string;
    formData: Record<string, any>;
    schoolInfo?: Record<string, any>;
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
    useRag?: boolean;
    stream?: boolean;
    onToken?: (chunk: string) => void;
}

export interface Q1GenerationResult {
    content: string;
    swotAnalysis: SWOTAnalysisResult;
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

// ============================================================================
// Q1 Generation Service
// ============================================================================

export class Q1GenerationService {
    private contentValidator: ContentValidator;

    constructor() {
        this.contentValidator = new ContentValidator();
    }

    /**
     * Generate Q1 《学校课程资源分析》
     * 
     * Process:
     * 1. Convert form data to SWOT input
     * 2. Perform SWOT analysis and scoring
     * 3. Call GenerationService with RAG integration
     * 4. Validate generated content
     * 5. Save output and create version
     */
    async generate(request: Q1GenerationRequest): Promise<Q1GenerationResult> {
        const {
            projectId,
            formData,
            schoolInfo,
            conversationHistory,
            useRag,
            stream,
            onToken,
        } = request;

        // 1. Convert form data to SWOT structure
        const swotInput = formDataToSWOTInput(formData);

        // 2. Perform SWOT analysis
        const swotAnalysis = analyzeSWOT(swotInput);

        // 3. Build user input for generation
        const userInput = this.buildGenerationInput(swotInput, swotAnalysis, formData);

        // 4. Call GenerationService
        const generationResult = stream
            ? await GenerationService.generateStream(
                  {
                      projectId,
                      stage: 'Q1',
                      userInput,
                      schoolInfo: schoolInfo || {
                          name: formData.school_name,
                          region: formData.school_region,
                          type: formData.school_type,
                      },
                      conversationHistory,
                      useRag: useRag ?? true,
                  },
                  { onToken }
              )
            : await GenerationService.generate({
                  projectId,
                  stage: 'Q1',
                  userInput,
                  schoolInfo: schoolInfo || {
                      name: formData.school_name,
                      region: formData.school_region,
                      type: formData.school_type,
                  },
                  conversationHistory,
                  useRag: useRag ?? true,
              });

        // 5. Validate generated content
        const contentValidation = this.contentValidator.validate(generationResult.content);
        const q1Validation = validateQ1Content(generationResult.content);

        const validation = {
            isValid: contentValidation.isValid && q1Validation.isValid,
            suggestions: [
                ...contentValidation.suggestions,
                ...q1Validation.suggestions,
            ],
        };

        // 6. Save stage output
        await stageService.saveStageOutput(
            projectId,
            'Q1',
            {
                content: generationResult.content,
                swotScores: swotAnalysis.dimensionScores,
                overallScore: swotAnalysis.overallScore,
                analysis: swotAnalysis.analysis,
            },
            {
                overall: swotAnalysis.overallScore,
                dimensions: swotAnalysis.dimensionScores as unknown as Record<string, number>,
            }
        );

        // 7. Create version record
        await this.createVersion(projectId, generationResult, swotAnalysis);

        return {
            content: generationResult.content,
            swotAnalysis,
            ragResults: generationResult.ragResults,
            validation,
            metadata: {
                promptUsed: generationResult.metadata.promptUsed,
                tokenUsage: generationResult.usage,
                timestamp: generationResult.metadata.timestamp,
            },
        };
    }

    /**
     * Build generation input from SWOT data
     */
    private buildGenerationInput(
        swotInput: SWOTInput,
        swotAnalysis: SWOTAnalysisResult,
        formData: Record<string, any>
    ): Record<string, any> {
        // Format strengths
        const strengthsText = swotInput.internal.strengths
            .map((s, i) => `${i + 1}. ${s.description} (评分: ${s.score}/5)`)
            .join('\n');

        // Format weaknesses
        const weaknessesText = swotInput.internal.weaknesses
            .map((w, i) => `${i + 1}. ${w.description} (评分: ${w.score}/5)`)
            .join('\n');

        // Format opportunities
        const opportunitiesText = swotInput.external.opportunities
            .map((o, i) => `${i + 1}. ${o.description} (评分: ${o.score}/5)`)
            .join('\n');

        // Format threats
        const threatsText = swotInput.external.threats
            .map((t, i) => `${i + 1}. ${t.description} (评分: ${t.score}/5)`)
            .join('\n');

        return {
            school_name: formData.school_name || '',
            school_region: formData.school_region || '',
            school_type: formData.school_type || '',
            
            // SWOT content
            strengths: strengthsText,
            weaknesses: weaknessesText,
            opportunities: opportunitiesText,
            threats: threatsText,
            
            // SWOT scores
            strengths_score: swotAnalysis.dimensionScores.strengths,
            weaknesses_score: swotAnalysis.dimensionScores.weaknesses,
            opportunities_score: swotAnalysis.dimensionScores.opportunities,
            threats_score: swotAnalysis.dimensionScores.threats,
            overall_score: swotAnalysis.overallScore,
            
            // Analysis insights
            strongest_areas: swotAnalysis.analysis.strongestAreas.join('、'),
            areas_for_improvement: swotAnalysis.analysis.areasForImprovement.join('、'),
            strategic_recommendations: swotAnalysis.analysis.strategicRecommendations.join('\n'),
            
            // Additional notes
            additional_notes: formData.additional_notes || '',
        };
    }

    /**
     * Create version record for the generation
     */
    private async createVersion(
        projectId: string,
        generationResult: GenerationResult,
        swotAnalysis: SWOTAnalysisResult
    ): Promise<void> {
        try {
            await createVersion({
                project_id: projectId,
                stage: "Q1",
                content: {
                    text: generationResult.content,
                    swotScores: swotAnalysis.dimensionScores,
                    overallScore: swotAnalysis.overallScore,
                },
                author: {
                    user_id: "system",
                    name: "AI Generation",
                },
                is_ai_generated: true,
                generation_metadata: {
                    prompt_used: generationResult.metadata.promptUsed,
                    rag_results: generationResult.ragResults,
                    token_usage: generationResult.usage,
                },
            });
        } catch (error) {
            console.error('[Q1GenerationService] Failed to create version:', error);
            // Don't throw - version creation failure shouldn't block generation
        }
    }

    /**
     * Regenerate Q1 content with updated input
     */
    async regenerate(
        projectId: string,
        feedback: string,
        conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
    ): Promise<Q1GenerationResult> {
        // Get existing stage data
        const stageData = await stageService.getStageData(projectId, 'Q1');
        
        if (!stageData.input) {
            throw new Error('No existing Q1 input found. Please fill in the SWOT form first.');
        }

        // Add feedback to conversation history
        const updatedHistory = [
            ...conversationHistory,
            { role: 'user' as const, content: feedback },
        ];

        return this.generate({
            projectId,
            formData: stageData.input,
            conversationHistory: updatedHistory,
        });
    }
}

// Export singleton instance
export const q1GenerationService = new Q1GenerationService();

export default Q1GenerationService;
