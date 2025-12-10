/**
 * Content Validation Module
 * 
 * Exports validation utilities for AI-generated educational content.
 */

export {
    ContentValidator,
    createContentValidator,
    DEFAULT_REQUIRED_KEYWORDS,
    DEFAULT_SENSITIVE_WORDS,
} from "./contentValidator";

export type {
    ValidationResult,
    ValidationDetails,
    ValidationOptions,
} from "./contentValidator";
