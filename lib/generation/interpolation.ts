/**
 * Prompt Variable Interpolation Utilities
 * 
 * Pure functions for template variable interpolation.
 * These functions have no external dependencies and can be tested in isolation.
 */

/**
 * Check if a string contains unresolved template variables ({{variable}})
 * @param text The text to check
 * @returns true if unresolved variables exist, false otherwise
 */
export function hasUnresolvedVariables(text: string): boolean {
    const pattern = /\{\{[^}]+\}\}/;
    return pattern.test(text);
}

/**
 * Extract all variable names from a template
 * @param template The template string
 * @returns Array of variable names found in the template
 */
export function extractVariables(template: string): string[] {
    const pattern = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;
    while ((match = pattern.exec(template)) !== null) {
        variables.push(match[1].trim());
    }
    return Array.from(new Set(variables)); // Remove duplicates
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escape special replacement string characters
 * In JavaScript's String.replace(), $ has special meaning:
 * $$ -> $, $& -> matched substring, $` -> before match, $' -> after match
 */
function escapeReplacement(string: string): string {
    return string.replace(/\$/g, "$$$$");
}

/**
 * Interpolate variables into a template string
 * Replaces all {{variable}} patterns with corresponding values
 * @param template The template string with {{variable}} placeholders
 * @param variables Object containing variable name -> value mappings
 * @returns The interpolated string
 */
export function interpolatePromptVariables(
    template: string,
    variables: Record<string, string>
): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        const pattern = new RegExp(`\\{\\{\\s*${escapeRegExp(key)}\\s*\\}\\}`, "g");
        // Escape $ in replacement string to prevent special replacement patterns
        result = result.replace(pattern, escapeReplacement(value));
    }
    return result;
}
