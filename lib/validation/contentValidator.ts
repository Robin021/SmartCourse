/**
 * Content Validation Service
 * 
 * Validates AI-generated educational content for compliance with
 * educational policies and content standards.
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    hasRequiredKeywords: boolean;
    hasSensitiveContent: boolean;
    structureValid: boolean;
    suggestions: string[];
    details: ValidationDetails;
}

export interface ValidationDetails {
    foundKeywords: string[];
    missingKeywords: string[];
    sensitiveWordsFound: string[];
    structureIssues: string[];
}

export interface ValidationOptions {
    checkKeywords?: boolean;
    checkSensitiveWords?: boolean;
    checkStructure?: boolean;
    requiredKeywords?: string[];
    sensitiveWords?: string[];
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Required educational keywords that should appear in validated content
 * Based on Requirements 13.1
 */
export const DEFAULT_REQUIRED_KEYWORDS = [
    "五育并举",
    "立德树人",
];

/**
 * Default sensitive words to filter
 * Based on Requirements 13.5
 */
export const DEFAULT_SENSITIVE_WORDS = [
    "暴力",
    "色情",
    "赌博",
    "毒品",
    "邪教",
    "反动",
    "歧视",
];

// ============================================================================
// Content Validator Class
// ============================================================================

export class ContentValidator {
    private requiredKeywords: string[];
    private sensitiveWords: string[];

    constructor(options?: {
        requiredKeywords?: string[];
        sensitiveWords?: string[];
    }) {
        this.requiredKeywords = options?.requiredKeywords || DEFAULT_REQUIRED_KEYWORDS;
        this.sensitiveWords = options?.sensitiveWords || DEFAULT_SENSITIVE_WORDS;
    }


    /**
     * Main validation method
     * Validates content against educational standards
     * 
     * @param content The content to validate
     * @param options Optional validation options
     * @returns ValidationResult with details and suggestions
     */
    validate(content: string, options?: ValidationOptions): ValidationResult {
        const checkKeywords = options?.checkKeywords !== false;
        const checkSensitiveWords = options?.checkSensitiveWords !== false;
        const checkStructure = options?.checkStructure !== false;

        const keywordsToCheck = options?.requiredKeywords || this.requiredKeywords;
        const sensitiveToCheck = options?.sensitiveWords || this.sensitiveWords;

        // Check for required keywords
        const keywordResult = checkKeywords 
            ? this.checkRequiredKeywords(content, keywordsToCheck)
            : { hasRequired: true, found: [], missing: [] };

        // Check for sensitive content
        const sensitiveResult = checkSensitiveWords
            ? this.checkSensitiveWords(content, sensitiveToCheck)
            : { hasSensitive: false, found: [] };

        // Check content structure
        const structureResult = checkStructure
            ? this.checkContentStructure(content)
            : { isValid: true, issues: [] };

        // Build suggestions
        const suggestions = this.buildSuggestions(
            keywordResult,
            sensitiveResult,
            structureResult
        );

        // Determine overall validity
        const isValid = keywordResult.hasRequired && 
                       !sensitiveResult.hasSensitive && 
                       structureResult.isValid;

        return {
            isValid,
            hasRequiredKeywords: keywordResult.hasRequired,
            hasSensitiveContent: sensitiveResult.hasSensitive,
            structureValid: structureResult.isValid,
            suggestions,
            details: {
                foundKeywords: keywordResult.found,
                missingKeywords: keywordResult.missing,
                sensitiveWordsFound: sensitiveResult.found,
                structureIssues: structureResult.issues,
            },
        };
    }

    /**
     * Check if content contains at least one required educational keyword
     * Based on Requirements 13.1
     */
    checkRequiredKeywords(
        content: string,
        keywords: string[] = this.requiredKeywords
    ): { hasRequired: boolean; found: string[]; missing: string[] } {
        const found: string[] = [];
        const missing: string[] = [];

        for (const keyword of keywords) {
            if (content.includes(keyword)) {
                found.push(keyword);
            } else {
                missing.push(keyword);
            }
        }

        // At least one required keyword must be present
        const hasRequired = found.length > 0;

        return { hasRequired, found, missing };
    }

    /**
     * Check if content contains sensitive words
     * Based on Requirements 13.5
     */
    checkSensitiveWords(
        content: string,
        sensitiveWords: string[] = this.sensitiveWords
    ): { hasSensitive: boolean; found: string[] } {
        const found: string[] = [];

        for (const word of sensitiveWords) {
            if (content.includes(word)) {
                found.push(word);
            }
        }

        return { hasSensitive: found.length > 0, found };
    }

    /**
     * Check content structure validity
     * Based on Requirements 13.3
     */
    checkContentStructure(content: string): { isValid: boolean; issues: string[] } {
        const issues: string[] = [];

        // Check minimum length
        if (content.trim().length < 50) {
            issues.push("内容过短，建议至少50个字符");
        }

        // Check for basic structure (paragraphs or sections)
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
        if (paragraphs.length < 1) {
            issues.push("内容缺少段落结构");
        }

        // Check for excessive repetition
        const words = content.split(/\s+/);
        const wordCounts: Record<string, number> = {};
        for (const word of words) {
            if (word.length > 2) {
                wordCounts[word] = (wordCounts[word] || 0) + 1;
            }
        }
        
        // Flag if any word appears more than 20% of total words
        const totalWords = words.length;
        const wordKeys = Object.keys(wordCounts);
        for (let i = 0; i < wordKeys.length; i++) {
            const word = wordKeys[i];
            const count = wordCounts[word];
            if (totalWords > 10 && count / totalWords > 0.2) {
                issues.push(`词语"${word}"重复过多`);
                break; // Only report first excessive repetition
            }
        }

        return { isValid: issues.length === 0, issues };
    }

    /**
     * Build improvement suggestions based on validation results
     * Based on Requirements 13.2, 13.6
     */
    private buildSuggestions(
        keywordResult: { hasRequired: boolean; found: string[]; missing: string[] },
        sensitiveResult: { hasSensitive: boolean; found: string[] },
        structureResult: { isValid: boolean; issues: string[] }
    ): string[] {
        const suggestions: string[] = [];

        // Keyword suggestions
        if (!keywordResult.hasRequired) {
            suggestions.push(
                `建议在内容中融入以下教育方针关键词：${keywordResult.missing.join("、")}`
            );
        }

        // Sensitive content suggestions
        if (sensitiveResult.hasSensitive) {
            suggestions.push(
                `请移除或替换以下敏感词汇：${sensitiveResult.found.join("、")}`
            );
        }

        // Structure suggestions
        for (const issue of structureResult.issues) {
            suggestions.push(issue);
        }

        return suggestions;
    }

    /**
     * Quick check if content passes keyword validation
     * Convenience method for Property 9 testing
     */
    passesKeywordValidation(content: string): boolean {
        const result = this.checkRequiredKeywords(content);
        return result.hasRequired;
    }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a default ContentValidator instance
 */
export function createContentValidator(options?: {
    requiredKeywords?: string[];
    sensitiveWords?: string[];
}): ContentValidator {
    return new ContentValidator(options);
}

export default ContentValidator;
