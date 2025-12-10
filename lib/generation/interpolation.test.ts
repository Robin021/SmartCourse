import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
    interpolatePromptVariables,
    hasUnresolvedVariables,
    extractVariables,
} from "./interpolation";

/**
 * Property-Based Tests for Prompt Variable Interpolation
 * 
 * **Feature: stage-workflow, Property 8: Prompt Variable Interpolation**
 * **Validates: Requirements 12.3**
 * 
 * For any generation request, the final prompt should not contain any 
 * unresolved template variables ({{variable}}).
 */
describe("Prompt Variable Interpolation", () => {
    /**
     * **Feature: stage-workflow, Property 8: Prompt Variable Interpolation**
     * **Validates: Requirements 12.3**
     * 
     * Property: For any template with variables and a complete variable mapping,
     * the interpolated result should contain no unresolved variables.
     */
    it("should resolve all variables when all mappings are provided", () => {
        fc.assert(
            fc.property(
                // Generate a list of variable names (alphanumeric, non-empty)
                fc.array(
                    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,20}$/),
                    { minLength: 1, maxLength: 10 }
                ),
                // Generate corresponding values (non-empty strings without {{ }})
                fc.array(
                    fc.string({ minLength: 1, maxLength: 100 })
                        .filter(s => !s.includes("{{") && !s.includes("}}")),
                    { minLength: 1, maxLength: 10 }
                ),
                (varNames, varValues) => {
                    // Ensure we have matching lengths
                    const names = [...new Set(varNames)].slice(0, Math.min(varNames.length, varValues.length));
                    const values = varValues.slice(0, names.length);
                    
                    if (names.length === 0) return true; // Skip empty cases
                    
                    // Build template with variables
                    const template = names.map(name => `Content: {{${name}}}`).join("\n");
                    
                    // Build variables mapping
                    const variables: Record<string, string> = {};
                    names.forEach((name, i) => {
                        variables[name] = values[i] || "default";
                    });
                    
                    // Interpolate
                    const result = interpolatePromptVariables(template, variables);
                    
                    // Property: No unresolved variables should remain
                    return !hasUnresolvedVariables(result);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: stage-workflow, Property 8: Prompt Variable Interpolation**
     * **Validates: Requirements 12.3**
     * 
     * Property: Interpolation should correctly replace all occurrences of a variable.
     */
    it("should replace all occurrences of each variable", () => {
        fc.assert(
            fc.property(
                // Variable name
                fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/),
                // Variable value (no template syntax)
                fc.string({ minLength: 1, maxLength: 50 })
                    .filter(s => !s.includes("{{") && !s.includes("}}")),
                // Number of occurrences
                fc.integer({ min: 1, max: 5 }),
                (varName, varValue, occurrences) => {
                    // Build template with multiple occurrences
                const template = Array(occurrences)
                    .fill(`{{${varName}}}`)
                    .join(" - ");
                
                const variables = { [varName]: varValue };
                const result = interpolatePromptVariables(template, variables);

                const expected = Array(occurrences).fill(varValue).join(" - ");
                return result === expected && !hasUnresolvedVariables(result);
            }
        ),
        { numRuns: 100 }
    );
});

    /**
     * **Feature: stage-workflow, Property 8: Prompt Variable Interpolation**
     * **Validates: Requirements 12.3**
     * 
     * Property: Variables with whitespace around the name should still be resolved.
     */
    it("should handle whitespace around variable names", () => {
        fc.assert(
            fc.property(
                fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/),
                fc.string({ minLength: 1, maxLength: 50 })
                    .filter(s => !s.includes("{{") && !s.includes("}}")),
                (varName, varValue) => {
                    // Template with whitespace around variable name
                    const template = `Before {{ ${varName} }} After`;
                    const variables = { [varName]: varValue };
                    const result = interpolatePromptVariables(template, variables);
                    
                    // Property: Variable should be resolved despite whitespace
                    return !hasUnresolvedVariables(result) && result.includes(varValue);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: stage-workflow, Property 8: Prompt Variable Interpolation**
     * **Validates: Requirements 12.3**
     * 
     * Property: extractVariables should find all unique variable names in a template.
     */
    it("should extract all unique variable names from template", () => {
        fc.assert(
            fc.property(
                fc.array(
                    fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/),
                    { minLength: 1, maxLength: 10 }
                ),
                (varNames) => {
                    const uniqueNames = [...new Set(varNames)];
                    if (uniqueNames.length === 0) return true;
                    
                    // Build template
                    const template = uniqueNames.map(name => `{{${name}}}`).join(" ");
                    
                    // Extract variables
                    const extracted = extractVariables(template);
                    
                    // Property: All unique names should be extracted
                    return uniqueNames.every(name => extracted.includes(name)) &&
                           extracted.length === uniqueNames.length;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: stage-workflow, Property 8: Prompt Variable Interpolation**
     * **Validates: Requirements 12.3**
     * 
     * Property: Template without variables should remain unchanged after interpolation.
     */
    it("should not modify templates without variables", () => {
        fc.assert(
            fc.property(
                // Generate text without {{ }} patterns
                fc.string({ minLength: 0, maxLength: 200 })
                    .filter(s => !s.includes("{{") && !s.includes("}}")),
                (template) => {
                    const variables = { someVar: "someValue" };
                    const result = interpolatePromptVariables(template, variables);
                    
                    // Property: Template should remain unchanged
                    return result === template;
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * **Feature: stage-workflow, Property 8: Prompt Variable Interpolation**
     * **Validates: Requirements 12.3**
     * 
     * Property: hasUnresolvedVariables should correctly detect unresolved variables.
     */
    it("should correctly detect unresolved variables", () => {
        fc.assert(
            fc.property(
                fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_]{0,15}$/),
                (varName) => {
                    const templateWithVar = `Text {{${varName}}} more text`;
                    const templateWithoutVar = `Text without variables`;
                    
                    // Property: Should detect variable in first template, not in second
                    return hasUnresolvedVariables(templateWithVar) === true &&
                           hasUnresolvedVariables(templateWithoutVar) === false;
                }
            ),
            { numRuns: 100 }
        );
    });
});

// Helper function for escaping regex special characters
function escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
