import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    ContentValidator,
    DEFAULT_REQUIRED_KEYWORDS,
    DEFAULT_SENSITIVE_WORDS,
} from "./contentValidator";

/**
 * Property-Based Tests for Content Validation
 * 
 * **Feature: stage-workflow, Property 9: Content Validation Keywords**
 * **Validates: Requirements 13.1**
 * 
 * For any generated content that passes validation, it should contain 
 * at least one required educational keyword ("五育并举" or "立德树人").
 */
describe("Content Validation", () => {
    const validator = new ContentValidator();

    /**
     * **Feature: stage-workflow, Property 9: Content Validation Keywords**
     * **Validates: Requirements 13.1**
     * 
     * Property: For any content that passes keyword validation,
     * it must contain at least one of the required keywords.
     */
    it("should only pass validation when content contains required keywords", () => {
        fc.assert(
            fc.property(
                // Generate random content that includes at least one required keyword
                fc.oneof(
                    // Content with "五育并举"
                    fc.tuple(
                        fc.string({ minLength: 0, maxLength: 100 }),
                        fc.string({ minLength: 0, maxLength: 100 })
                    ).map(([before, after]) => `${before}五育并举${after}`),
                    // Content with "立德树人"
                    fc.tuple(
                        fc.string({ minLength: 0, maxLength: 100 }),
                        fc.string({ minLength: 0, maxLength: 100 })
                    ).map(([before, after]) => `${before}立德树人${after}`),
                    // Content with both
                    fc.tuple(
                        fc.string({ minLength: 0, maxLength: 50 }),
                        fc.string({ minLength: 0, maxLength: 50 }),
                        fc.string({ minLength: 0, maxLength: 50 })
                    ).map(([a, b, c]) => `${a}五育并举${b}立德树人${c}`)
                ),
                (contentWithKeyword) => {
                    const result = validator.checkRequiredKeywords(contentWithKeyword);
                    
                    // Property: Content with keywords should pass keyword validation
                    return result.hasRequired === true && result.found.length > 0;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: stage-workflow, Property 9: Content Validation Keywords**
     * **Validates: Requirements 13.1**
     * 
     * Property: For any content without required keywords,
     * validation should fail and report missing keywords.
     */
    it("should fail validation when content lacks required keywords", () => {
        fc.assert(
            fc.property(
                // Generate content that definitely doesn't contain required keywords
                fc.string({ minLength: 1, maxLength: 200 })
                    .filter(s => 
                        !DEFAULT_REQUIRED_KEYWORDS.some(kw => s.includes(kw))
                    ),
                (contentWithoutKeyword) => {
                    const result = validator.checkRequiredKeywords(contentWithoutKeyword);
                    
                    // Property: Content without keywords should fail validation
                    return result.hasRequired === false && 
                           result.found.length === 0 &&
                           result.missing.length === DEFAULT_REQUIRED_KEYWORDS.length;
                }
            ),
            { numRuns: 100 }
        );
    });


    /**
     * **Feature: stage-workflow, Property 9: Content Validation Keywords**
     * **Validates: Requirements 13.1**
     * 
     * Property: The passesKeywordValidation convenience method should
     * return true if and only if hasRequired is true.
     */
    it("should have consistent passesKeywordValidation result", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 0, maxLength: 300 }),
                (content) => {
                    const detailedResult = validator.checkRequiredKeywords(content);
                    const quickResult = validator.passesKeywordValidation(content);
                    
                    // Property: Both methods should agree
                    return detailedResult.hasRequired === quickResult;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: stage-workflow, Property 9: Content Validation Keywords**
     * **Validates: Requirements 13.1**
     * 
     * Property: Found keywords should be a subset of required keywords,
     * and found + missing should equal all required keywords.
     */
    it("should correctly partition keywords into found and missing", () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 0, maxLength: 300 }),
                (content) => {
                    const result = validator.checkRequiredKeywords(content);
                    
                    // Property 1: found keywords should be subset of required
                    const foundIsSubset = result.found.every(kw => 
                        DEFAULT_REQUIRED_KEYWORDS.includes(kw)
                    );
                    
                    // Property 2: missing keywords should be subset of required
                    const missingIsSubset = result.missing.every(kw => 
                        DEFAULT_REQUIRED_KEYWORDS.includes(kw)
                    );
                    
                    // Property 3: found + missing should cover all required keywords
                    const allCovered = DEFAULT_REQUIRED_KEYWORDS.every(kw =>
                        result.found.includes(kw) || result.missing.includes(kw)
                    );
                    
                    // Property 4: no overlap between found and missing
                    const noOverlap = !result.found.some(kw => result.missing.includes(kw));
                    
                    return foundIsSubset && missingIsSubset && allCovered && noOverlap;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Sensitive word detection tests
     * **Validates: Requirements 13.5**
     */
    describe("Sensitive Word Detection", () => {
        it("should detect sensitive words when present", () => {
            fc.assert(
                fc.property(
                    // Pick a random sensitive word
                    fc.constantFrom(...DEFAULT_SENSITIVE_WORDS),
                    // Generate surrounding content
                    fc.tuple(
                        fc.string({ minLength: 0, maxLength: 50 }),
                        fc.string({ minLength: 0, maxLength: 50 })
                    ),
                    (sensitiveWord, [before, after]) => {
                        const content = `${before}${sensitiveWord}${after}`;
                        const result = validator.checkSensitiveWords(content);
                        
                        // Property: Should detect the sensitive word
                        return result.hasSensitive === true && 
                               result.found.includes(sensitiveWord);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should not flag content without sensitive words", () => {
            fc.assert(
                fc.property(
                    // Generate content without sensitive words
                    fc.string({ minLength: 1, maxLength: 200 })
                        .filter(s => 
                            !DEFAULT_SENSITIVE_WORDS.some(sw => s.includes(sw))
                        ),
                    (cleanContent) => {
                        const result = validator.checkSensitiveWords(cleanContent);
                        
                        // Property: Should not detect any sensitive words
                        return result.hasSensitive === false && 
                               result.found.length === 0;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Full validation integration tests
     * **Validates: Requirements 13.1, 13.2, 13.3, 13.5, 13.6**
     */
    describe("Full Validation", () => {
        it("should pass validation for compliant content", () => {
            fc.assert(
                fc.property(
                    // Generate compliant content: has keyword, no sensitive words, good structure
                    fc.tuple(
                        fc.constantFrom("五育并举", "立德树人"),
                        fc.string({ minLength: 50, maxLength: 200 })
                            .filter(s => 
                                !DEFAULT_SENSITIVE_WORDS.some(sw => s.includes(sw)) &&
                                !DEFAULT_REQUIRED_KEYWORDS.some(kw => s.includes(kw))
                            )
                    ).map(([keyword, text]) => `${text}\n\n${keyword}是教育的核心理念。`),
                    (compliantContent) => {
                        const result = validator.validate(compliantContent);
                        
                        // Property: Compliant content should pass validation
                        return result.isValid === true &&
                               result.hasRequiredKeywords === true &&
                               result.hasSensitiveContent === false;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should provide suggestions for non-compliant content", () => {
            fc.assert(
                fc.property(
                    // Generate non-compliant content (no keywords)
                    fc.string({ minLength: 60, maxLength: 200 })
                        .filter(s => 
                            !DEFAULT_REQUIRED_KEYWORDS.some(kw => s.includes(kw)) &&
                            !DEFAULT_SENSITIVE_WORDS.some(sw => s.includes(sw))
                        ),
                    (nonCompliantContent) => {
                        const result = validator.validate(nonCompliantContent);
                        
                        // Property: Non-compliant content should have suggestions
                        return result.hasRequiredKeywords === false &&
                               result.suggestions.length > 0;
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
describe("Content Validation - Unit Tests", () => {
    const validator = new ContentValidator();

    it("should handle empty content", () => {
        const result = validator.validate("");
        expect(result.isValid).toBe(false);
        expect(result.hasRequiredKeywords).toBe(false);
    });

    it("should handle content with only whitespace", () => {
        const result = validator.validate("   \n\n   ");
        expect(result.isValid).toBe(false);
    });

    it("should detect multiple sensitive words", () => {
        const content = "这是暴力和赌博的内容";
        const result = validator.checkSensitiveWords(content);
        expect(result.hasSensitive).toBe(true);
        expect(result.found).toContain("暴力");
        expect(result.found).toContain("赌博");
    });

    it("should allow custom keywords", () => {
        const customValidator = new ContentValidator({
            requiredKeywords: ["自定义关键词"],
        });
        
        const result = customValidator.checkRequiredKeywords("包含自定义关键词的内容");
        expect(result.hasRequired).toBe(true);
        expect(result.found).toContain("自定义关键词");
    });

    it("should allow custom sensitive words", () => {
        const customValidator = new ContentValidator({
            sensitiveWords: ["测试敏感词"],
        });
        
        const result = customValidator.checkSensitiveWords("包含测试敏感词的内容");
        expect(result.hasSensitive).toBe(true);
    });
});
