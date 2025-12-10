import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    calculateDimensionScore,
    calculateSWOTScores,
    calculateOverallScore,
    clampScore,
    validateSWOTInput,
    analyzeSWOT,
    SWOTItem,
    SWOTInput,
    SWOTDimensionScores,
    SWOT_SCORE_MIN,
    SWOT_SCORE_MAX,
    ITEM_SCORE_MIN,
    ITEM_SCORE_MAX,
    ITEMS_PER_CATEGORY,
} from "./swotAnalysis";

/**
 * Property-Based Tests for Q1 SWOT Analysis
 * 
 * **Feature: stage-workflow, Property 6: SWOT Score Range**
 * **Validates: Requirements 1.4**
 * 
 * For any Q1 SWOT analysis, each dimension score (strengths, weaknesses, 
 * opportunities, threats) should be between 0 and 100.
 */

// ============================================================================
// Generators
// ============================================================================

/**
 * Generate a valid SWOT item with score in valid range
 * Note: Description must be non-empty after trimming to pass validation
 */
const swotItemArb = (
    type: 'strength' | 'weakness' | 'opportunity' | 'threat',
    category: 'internal' | 'external'
): fc.Arbitrary<SWOTItem> =>
    fc.record({
        id: fc.uuid(),
        category: fc.constant(category),
        type: fc.constant(type),
        // Use stringMatching to ensure non-whitespace content
        description: fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5].{0,199}$/),
        score: fc.integer({ min: ITEM_SCORE_MIN, max: ITEM_SCORE_MAX }),
    });

/**
 * Generate an array of SWOT items
 */
const swotItemsArb = (
    type: 'strength' | 'weakness' | 'opportunity' | 'threat',
    category: 'internal' | 'external',
    count: number
): fc.Arbitrary<SWOTItem[]> =>
    fc.array(swotItemArb(type, category), { minLength: count, maxLength: count + 5 });

/**
 * Generate a complete valid SWOT input
 */
const validSWOTInputArb: fc.Arbitrary<SWOTInput> = fc.record({
    internal: fc.record({
        strengths: swotItemsArb('strength', 'internal', ITEMS_PER_CATEGORY),
        weaknesses: swotItemsArb('weakness', 'internal', ITEMS_PER_CATEGORY),
    }),
    external: fc.record({
        opportunities: swotItemsArb('opportunity', 'external', ITEMS_PER_CATEGORY),
        threats: swotItemsArb('threat', 'external', ITEMS_PER_CATEGORY),
    }),
    schoolName: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
    region: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

/**
 * Generate dimension scores directly for testing
 */
const dimensionScoresArb: fc.Arbitrary<SWOTDimensionScores> = fc.record({
    strengths: fc.integer({ min: SWOT_SCORE_MIN, max: SWOT_SCORE_MAX }),
    weaknesses: fc.integer({ min: SWOT_SCORE_MIN, max: SWOT_SCORE_MAX }),
    opportunities: fc.integer({ min: SWOT_SCORE_MIN, max: SWOT_SCORE_MAX }),
    threats: fc.integer({ min: SWOT_SCORE_MIN, max: SWOT_SCORE_MAX }),
});

// ============================================================================
// Property Tests
// ============================================================================

describe("Q1 SWOT Analysis", () => {
    /**
     * **Feature: stage-workflow, Property 6: SWOT Score Range**
     * **Validates: Requirements 1.4**
     * 
     * Property: For any SWOT analysis, each dimension score should be 
     * between 0 and 100.
     */
    describe("Property 6: SWOT Score Range", () => {
        it("should produce dimension scores within 0-100 range for any valid input", () => {
            fc.assert(
                fc.property(validSWOTInputArb, (input) => {
                    const scores = calculateSWOTScores(input);
                    
                    // Property: All dimension scores must be in [0, 100]
                    const strengthsInRange = scores.strengths >= SWOT_SCORE_MIN && 
                                            scores.strengths <= SWOT_SCORE_MAX;
                    const weaknessesInRange = scores.weaknesses >= SWOT_SCORE_MIN && 
                                             scores.weaknesses <= SWOT_SCORE_MAX;
                    const opportunitiesInRange = scores.opportunities >= SWOT_SCORE_MIN && 
                                                scores.opportunities <= SWOT_SCORE_MAX;
                    const threatsInRange = scores.threats >= SWOT_SCORE_MIN && 
                                          scores.threats <= SWOT_SCORE_MAX;
                    
                    return strengthsInRange && weaknessesInRange && 
                           opportunitiesInRange && threatsInRange;
                }),
                { numRuns: 100 }
            );
        });

        it("should produce overall score within 0-100 range for any dimension scores", () => {
            fc.assert(
                fc.property(dimensionScoresArb, (dimensionScores) => {
                    const overallScore = calculateOverallScore(dimensionScores);
                    
                    // Property: Overall score must be in [0, 100]
                    return overallScore >= SWOT_SCORE_MIN && 
                           overallScore <= SWOT_SCORE_MAX;
                }),
                { numRuns: 100 }
            );
        });

        it("should produce scores within range for complete SWOT analysis", () => {
            fc.assert(
                fc.property(validSWOTInputArb, (input) => {
                    const result = analyzeSWOT(input);
                    
                    // Property: All scores in the result must be in [0, 100]
                    const { dimensionScores, overallScore } = result;
                    
                    const allDimensionsInRange = 
                        dimensionScores.strengths >= SWOT_SCORE_MIN &&
                        dimensionScores.strengths <= SWOT_SCORE_MAX &&
                        dimensionScores.weaknesses >= SWOT_SCORE_MIN &&
                        dimensionScores.weaknesses <= SWOT_SCORE_MAX &&
                        dimensionScores.opportunities >= SWOT_SCORE_MIN &&
                        dimensionScores.opportunities <= SWOT_SCORE_MAX &&
                        dimensionScores.threats >= SWOT_SCORE_MIN &&
                        dimensionScores.threats <= SWOT_SCORE_MAX;
                    
                    const overallInRange = overallScore >= SWOT_SCORE_MIN && 
                                          overallScore <= SWOT_SCORE_MAX;
                    
                    return allDimensionsInRange && overallInRange;
                }),
                { numRuns: 100 }
            );
        });

        it("should clamp any numeric value to 0-100 range", () => {
            fc.assert(
                fc.property(
                    fc.oneof(
                        fc.integer({ min: -1000, max: 1000 }),
                        fc.double({ min: -1000, max: 1000, noNaN: true }),
                        fc.constant(Infinity),
                        fc.constant(-Infinity),
                        fc.constant(NaN)
                    ),
                    (value) => {
                        const clamped = clampScore(value);
                        
                        // Property: Clamped value must always be in [0, 100]
                        return clamped >= SWOT_SCORE_MIN && 
                               clamped <= SWOT_SCORE_MAX &&
                               Number.isFinite(clamped);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should calculate dimension score within range for any item scores", () => {
            fc.assert(
                fc.property(
                    fc.array(
                        fc.record({
                            id: fc.uuid(),
                            category: fc.constant('internal' as const),
                            type: fc.constant('strength' as const),
                            description: fc.string({ minLength: 1, maxLength: 50 }),
                            score: fc.integer({ min: ITEM_SCORE_MIN, max: ITEM_SCORE_MAX }),
                        }),
                        { minLength: 1, maxLength: 20 }
                    ),
                    (items) => {
                        const score = calculateDimensionScore(items);
                        
                        // Property: Dimension score must be in [0, 100]
                        return score >= SWOT_SCORE_MIN && score <= SWOT_SCORE_MAX;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should return 0 for empty items array", () => {
            const score = calculateDimensionScore([]);
            expect(score).toBe(0);
        });

        it("should handle edge case of all minimum scores", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (itemCount) => {
                        const items: SWOTItem[] = Array.from({ length: itemCount }, (_, i) => ({
                            id: `item-${i}`,
                            category: 'internal',
                            type: 'strength',
                            description: `Item ${i}`,
                            score: ITEM_SCORE_MIN,
                        }));
                        
                        const score = calculateDimensionScore(items);
                        
                        // Property: Score should be 20 (1/5 * 100) for all min scores
                        return score === 20;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should handle edge case of all maximum scores", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (itemCount) => {
                        const items: SWOTItem[] = Array.from({ length: itemCount }, (_, i) => ({
                            id: `item-${i}`,
                            category: 'internal',
                            type: 'strength',
                            description: `Item ${i}`,
                            score: ITEM_SCORE_MAX,
                        }));
                        
                        const score = calculateDimensionScore(items);
                        
                        // Property: Score should be 100 for all max scores
                        return score === 100;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Additional property tests for SWOT validation
     */
    describe("SWOT Validation Properties", () => {
        it("should validate that valid input passes validation", () => {
            fc.assert(
                fc.property(validSWOTInputArb, (input) => {
                    const errors = validateSWOTInput(input);
                    
                    // Property: Valid input should have no validation errors
                    return errors.length === 0;
                }),
                { numRuns: 100 }
            );
        });

        it("should detect missing items in incomplete input", () => {
            fc.assert(
                fc.property(
                    fc.record({
                        internal: fc.record({
                            strengths: fc.array(swotItemArb('strength', 'internal'), { 
                                minLength: 0, 
                                maxLength: ITEMS_PER_CATEGORY - 1 
                            }),
                            weaknesses: swotItemsArb('weakness', 'internal', ITEMS_PER_CATEGORY),
                        }),
                        external: fc.record({
                            opportunities: swotItemsArb('opportunity', 'external', ITEMS_PER_CATEGORY),
                            threats: swotItemsArb('threat', 'external', ITEMS_PER_CATEGORY),
                        }),
                    }),
                    (input) => {
                        const errors = validateSWOTInput(input);
                        
                        // Property: Incomplete input should have validation errors
                        return errors.length > 0;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Score calculation consistency tests
     */
    describe("Score Calculation Consistency", () => {
        it("should produce consistent scores for same input", () => {
            fc.assert(
                fc.property(validSWOTInputArb, (input) => {
                    const scores1 = calculateSWOTScores(input);
                    const scores2 = calculateSWOTScores(input);
                    
                    // Property: Same input should produce same scores
                    return scores1.strengths === scores2.strengths &&
                           scores1.weaknesses === scores2.weaknesses &&
                           scores1.opportunities === scores2.opportunities &&
                           scores1.threats === scores2.threats;
                }),
                { numRuns: 100 }
            );
        });

        it("should produce higher dimension score for higher item scores", () => {
            fc.assert(
                fc.property(
                    fc.integer({ min: 1, max: 10 }),
                    (itemCount) => {
                        // Create items with low scores
                        const lowItems: SWOTItem[] = Array.from({ length: itemCount }, (_, i) => ({
                            id: `low-${i}`,
                            category: 'internal',
                            type: 'strength',
                            description: `Low item ${i}`,
                            score: ITEM_SCORE_MIN,
                        }));
                        
                        // Create items with high scores
                        const highItems: SWOTItem[] = Array.from({ length: itemCount }, (_, i) => ({
                            id: `high-${i}`,
                            category: 'internal',
                            type: 'strength',
                            description: `High item ${i}`,
                            score: ITEM_SCORE_MAX,
                        }));
                        
                        const lowScore = calculateDimensionScore(lowItems);
                        const highScore = calculateDimensionScore(highItems);
                        
                        // Property: Higher item scores should produce higher dimension score
                        return highScore >= lowScore;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});

/**
 * Unit tests for edge cases
 */
describe("SWOT Analysis - Unit Tests", () => {
    it("should handle null/undefined input gracefully", () => {
        const errors = validateSWOTInput(null as any);
        expect(errors).toContain('SWOT input is required');
    });

    it("should calculate correct score for known values", () => {
        const items: SWOTItem[] = [
            { id: '1', category: 'internal', type: 'strength', description: 'Test 1', score: 3 },
            { id: '2', category: 'internal', type: 'strength', description: 'Test 2', score: 4 },
            { id: '3', category: 'internal', type: 'strength', description: 'Test 3', score: 5 },
        ];
        
        // Total: 12, Max: 15, Score: 80
        const score = calculateDimensionScore(items);
        expect(score).toBe(80);
    });

    it("should calculate overall score correctly", () => {
        const dimensionScores: SWOTDimensionScores = {
            strengths: 80,
            weaknesses: 40,
            opportunities: 70,
            threats: 30,
        };
        
        // Overall = (80 + 70 + (100-40) + (100-30)) / 4 = (80 + 70 + 60 + 70) / 4 = 70
        const overall = calculateOverallScore(dimensionScores);
        expect(overall).toBe(70);
    });

    it("should filter out invalid item scores", () => {
        const items: SWOTItem[] = [
            { id: '1', category: 'internal', type: 'strength', description: 'Valid', score: 3 },
            { id: '2', category: 'internal', type: 'strength', description: 'Invalid', score: 10 }, // Out of range
            { id: '3', category: 'internal', type: 'strength', description: 'Invalid', score: 0 }, // Out of range
        ];
        
        // Only first item is valid: 3/5 * 100 = 60
        const score = calculateDimensionScore(items);
        expect(score).toBe(60);
    });
});
