import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { formatExportContent } from "@/lib/export/exportService";

/**
 * Property 10: Export Content Completeness
 * Validates: Requirements 16.5
 */

describe("Export content formatting", () => {
    it("includes every stage name and report text when formatting", () => {
        fc.assert(
            fc.property(
                fc.uniqueArray(
                    fc.record({
                        stageId: fc.constantFrom("Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7", "Q8", "Q9", "Q10"),
                        name: fc.string({ minLength: 3, maxLength: 12 }),
                        report: fc.string({ minLength: 5, maxLength: 120 }),
                    }),
                    { minLength: 1, maxLength: 5, selector: (entry) => entry.stageId }
                ),
                (entries) => {
                    const project: any = { name: "Demo Project", config_version: "v1", stages: {} };
                    entries.forEach((entry) => {
                        project.stages[entry.stageId] = { output: { report: entry.report } };
                    });

                    const stageDefs = entries.map((entry) => ({
                        stage_id: entry.stageId,
                        name: entry.name,
                    }));

                    const content = formatExportContent({ project, stageDefs });
                    return entries.every(
                        (entry) =>
                            content.includes(entry.stageId) &&
                            content.includes(entry.name) &&
                            content.includes(entry.report)
                    );
                }
            ),
            { verbose: true }
        );
    });

    it("filters to the requested stages when a subset is provided", () => {
        const project: any = {
            name: "Filter Demo",
            config_version: "v1",
            stages: {
                Q2: { output: { report: "Philosophy report" } },
                Q3: { output: { report: "Idea report" } },
            },
        };

        const stageDefs = [
            { stage_id: "Q2", name: "教育哲学" },
            { stage_id: "Q3", name: "办学理念" },
        ];

        const content = formatExportContent({ project, stageDefs, stages: ["Q2"] });
        expect(content).toContain("Philosophy report");
        expect(content).toContain("教育哲学");
        expect(content).not.toContain("Idea report");
    });
});
