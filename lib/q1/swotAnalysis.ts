/**
 * Q1 SWOT Analysis Module
 * 
 * Implements SWOT analysis scoring and validation for Q1 stage.
 * Based on Requirements 1.1-1.7
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * SWOT item representing a single strength, weakness, opportunity, or threat
 */
export interface SWOTItem {
    id: string;
    category: 'internal' | 'external';
    type: 'strength' | 'weakness' | 'opportunity' | 'threat';
    description: string;
    score: number; // 1-5 rating
}

/**
 * Complete SWOT input data structure
 * 10 internal items (5 strengths, 5 weaknesses)
 * 10 external items (5 opportunities, 5 threats)
 */
export interface SWOTInput {
    internal: {
        strengths: SWOTItem[];
        weaknesses: SWOTItem[];
    };
    external: {
        opportunities: SWOTItem[];
        threats: SWOTItem[];
    };
    schoolName?: string;
    region?: string;
    additionalNotes?: string;
}

/**
 * SWOT dimension scores (0-100 for each dimension)
 * Based on Requirements 1.4
 */
export interface SWOTDimensionScores {
    strengths: number;    // 0-100
    weaknesses: number;   // 0-100
    opportunities: number; // 0-100
    threats: number;      // 0-100
}

/**
 * Complete SWOT analysis result
 */
export interface SWOTAnalysisResult {
    dimensionScores: SWOTDimensionScores;
    overallScore: number; // 0-100
    analysis: {
        strongestAreas: string[];
        areasForImprovement: string[];
        strategicRecommendations: string[];
    };
    isValid: boolean;
    validationErrors: string[];
}

// ============================================================================
// Constants
// ============================================================================

export const SWOT_SCORE_MIN = 0;
export const SWOT_SCORE_MAX = 100;
export const ITEM_SCORE_MIN = 1;
export const ITEM_SCORE_MAX = 5;
export const ITEMS_PER_CATEGORY = 5;
export const TOTAL_INTERNAL_ITEMS = 10;
export const TOTAL_EXTERNAL_ITEMS = 10;

// ============================================================================
// SWOT Scoring Functions
// ============================================================================

/**
 * Calculate dimension score from items (0-100)
 * 
 * Formula: (sum of item scores / max possible score) * 100
 * Max possible = items_count * ITEM_SCORE_MAX
 * 
 * @param items Array of SWOT items
 * @returns Score between 0 and 100
 */
export function calculateDimensionScore(items: SWOTItem[]): number {
    if (!items || items.length === 0) {
        return 0;
    }

    const validItems = items.filter(item => 
        typeof item.score === 'number' && 
        item.score >= ITEM_SCORE_MIN && 
        item.score <= ITEM_SCORE_MAX
    );

    if (validItems.length === 0) {
        return 0;
    }

    const totalScore = validItems.reduce((sum, item) => sum + item.score, 0);
    const maxPossible = validItems.length * ITEM_SCORE_MAX;
    
    // Calculate percentage and ensure it's within bounds
    const score = (totalScore / maxPossible) * 100;
    
    return clampScore(score);
}

/**
 * Clamp a score to the valid range [0, 100]
 */
export function clampScore(score: number): number {
    if (!Number.isFinite(score)) {
        return 0;
    }
    return Math.max(SWOT_SCORE_MIN, Math.min(SWOT_SCORE_MAX, Math.round(score)));
}

/**
 * Calculate all SWOT dimension scores
 * 
 * @param input SWOT input data
 * @returns Dimension scores (each 0-100)
 */
export function calculateSWOTScores(input: SWOTInput): SWOTDimensionScores {
    return {
        strengths: calculateDimensionScore(input.internal?.strengths || []),
        weaknesses: calculateDimensionScore(input.internal?.weaknesses || []),
        opportunities: calculateDimensionScore(input.external?.opportunities || []),
        threats: calculateDimensionScore(input.external?.threats || []),
    };
}

/**
 * Calculate overall SWOT score
 * 
 * Formula: Weighted average considering:
 * - Strengths and Opportunities are positive factors
 * - Weaknesses and Threats are negative factors (inverted)
 * 
 * Overall = (S + O + (100 - W) + (100 - T)) / 4
 * 
 * @param dimensionScores Individual dimension scores
 * @returns Overall score (0-100)
 */
export function calculateOverallScore(dimensionScores: SWOTDimensionScores): number {
    const { strengths, weaknesses, opportunities, threats } = dimensionScores;
    
    // Invert negative factors (high weakness/threat = low score)
    const invertedWeaknesses = SWOT_SCORE_MAX - weaknesses;
    const invertedThreats = SWOT_SCORE_MAX - threats;
    
    const overall = (strengths + opportunities + invertedWeaknesses + invertedThreats) / 4;
    
    return clampScore(overall);
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a single SWOT item
 */
export function validateSWOTItem(item: SWOTItem): string[] {
    const errors: string[] = [];
    
    if (!item.id) {
        errors.push('Item ID is required');
    }
    
    if (!item.description || item.description.trim().length === 0) {
        errors.push(`Item ${item.id}: Description is required`);
    }
    
    if (typeof item.score !== 'number' || item.score < ITEM_SCORE_MIN || item.score > ITEM_SCORE_MAX) {
        errors.push(`Item ${item.id}: Score must be between ${ITEM_SCORE_MIN} and ${ITEM_SCORE_MAX}`);
    }
    
    if (!['strength', 'weakness', 'opportunity', 'threat'].includes(item.type)) {
        errors.push(`Item ${item.id}: Invalid type`);
    }
    
    if (!['internal', 'external'].includes(item.category)) {
        errors.push(`Item ${item.id}: Invalid category`);
    }
    
    return errors;
}

/**
 * Validate complete SWOT input
 */
export function validateSWOTInput(input: SWOTInput): string[] {
    const errors: string[] = [];
    
    if (!input) {
        return ['SWOT input is required'];
    }
    
    // Validate internal items
    const strengths = input.internal?.strengths || [];
    const weaknesses = input.internal?.weaknesses || [];
    
    if (strengths.length < ITEMS_PER_CATEGORY) {
        errors.push(`At least ${ITEMS_PER_CATEGORY} strengths are required`);
    }
    
    if (weaknesses.length < ITEMS_PER_CATEGORY) {
        errors.push(`At least ${ITEMS_PER_CATEGORY} weaknesses are required`);
    }
    
    // Validate external items
    const opportunities = input.external?.opportunities || [];
    const threats = input.external?.threats || [];
    
    if (opportunities.length < ITEMS_PER_CATEGORY) {
        errors.push(`At least ${ITEMS_PER_CATEGORY} opportunities are required`);
    }
    
    if (threats.length < ITEMS_PER_CATEGORY) {
        errors.push(`At least ${ITEMS_PER_CATEGORY} threats are required`);
    }
    
    // Validate individual items
    const allItems = [...strengths, ...weaknesses, ...opportunities, ...threats];
    for (const item of allItems) {
        errors.push(...validateSWOTItem(item));
    }
    
    return errors;
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Perform complete SWOT analysis
 * 
 * @param input SWOT input data
 * @returns Complete analysis result with scores and recommendations
 */
export function analyzeSWOT(input: SWOTInput): SWOTAnalysisResult {
    const validationErrors = validateSWOTInput(input);
    const isValid = validationErrors.length === 0;
    
    const dimensionScores = calculateSWOTScores(input);
    const overallScore = calculateOverallScore(dimensionScores);
    
    // Generate analysis insights
    const analysis = generateAnalysisInsights(dimensionScores, input);
    
    return {
        dimensionScores,
        overallScore,
        analysis,
        isValid,
        validationErrors,
    };
}

/**
 * Generate analysis insights based on scores
 */
function generateAnalysisInsights(
    scores: SWOTDimensionScores,
    input: SWOTInput
): SWOTAnalysisResult['analysis'] {
    const strongestAreas: string[] = [];
    const areasForImprovement: string[] = [];
    const strategicRecommendations: string[] = [];
    
    // Identify strongest areas (score >= 70)
    if (scores.strengths >= 70) {
        strongestAreas.push('内部优势明显');
    }
    if (scores.opportunities >= 70) {
        strongestAreas.push('外部机遇丰富');
    }
    
    // Identify areas for improvement (score >= 70 for negative factors)
    if (scores.weaknesses >= 70) {
        areasForImprovement.push('内部劣势需要关注');
    }
    if (scores.threats >= 70) {
        areasForImprovement.push('外部威胁需要应对');
    }
    
    // Generate strategic recommendations
    if (scores.strengths >= 60 && scores.opportunities >= 60) {
        strategicRecommendations.push('SO策略：利用优势抓住机遇');
    }
    if (scores.strengths >= 60 && scores.threats >= 60) {
        strategicRecommendations.push('ST策略：利用优势应对威胁');
    }
    if (scores.weaknesses >= 60 && scores.opportunities >= 60) {
        strategicRecommendations.push('WO策略：克服劣势把握机遇');
    }
    if (scores.weaknesses >= 60 && scores.threats >= 60) {
        strategicRecommendations.push('WT策略：减少劣势规避威胁');
    }
    
    return {
        strongestAreas,
        areasForImprovement,
        strategicRecommendations,
    };
}

// ============================================================================
// Q1 Specific Validation
// ============================================================================

/**
 * Q1-specific content validation
 * Checks if generated content meets Q1 requirements
 */
export function validateQ1Content(content: string): {
    isValid: boolean;
    suggestions: string[];
} {
    const suggestions: string[] = [];
    
    // Check for SWOT-related keywords
    const swotKeywords = ['优势', '劣势', '机会', '威胁', 'SWOT'];
    const hasSwotKeywords = swotKeywords.some(kw => content.includes(kw));
    
    if (!hasSwotKeywords) {
        suggestions.push('建议在内容中包含SWOT分析相关术语');
    }
    
    // Check for school context
    const schoolKeywords = ['学校', '课程', '教育', '资源'];
    const hasSchoolContext = schoolKeywords.some(kw => content.includes(kw));
    
    if (!hasSchoolContext) {
        suggestions.push('建议在内容中体现学校课程情境');
    }
    
    // Check minimum length
    if (content.length < 200) {
        suggestions.push('内容较短，建议补充更多分析细节');
    }
    
    return {
        isValid: suggestions.length === 0,
        suggestions,
    };
}

export default {
    calculateDimensionScore,
    calculateSWOTScores,
    calculateOverallScore,
    clampScore,
    validateSWOTInput,
    validateSWOTItem,
    analyzeSWOT,
    validateQ1Content,
};
