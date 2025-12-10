import { describe, it, expect } from "vitest";
import { computeFiveVirtuesCoverage, FIVE_VIRTUES } from "@/lib/q4/q4FormConfig";

/**
 * Property 7: Five Virtues Coverage
 * Validates: Requirements 4.6
 */

describe("computeFiveVirtuesCoverage", () => {
    it("returns 20 each when no priorities provided", () => {
        const result = computeFiveVirtuesCoverage([]);
        expect(result.overall).toBeGreaterThan(0);
        FIVE_VIRTUES.forEach((v) => {
            expect(result.dimensions[v]).toBe(20);
        });
    });

    it("weights top priorities higher", () => {
        const result = computeFiveVirtuesCoverage(["德育", "智育", "体育"]);
        expect(result.dimensions["德育"]).toBeGreaterThan(result.dimensions["劳育"]);
        expect(result.dimensions["智育"]).toBeGreaterThan(result.dimensions["劳育"]);
    });

    it("caps suggestions when low coverage exists", () => {
        const result = computeFiveVirtuesCoverage(["德育"]);
        const lowDims = Object.entries(result.dimensions).filter(([, v]) => v < 15);
        expect(result.suggestions.length).toBeGreaterThanOrEqual(lowDims.length);
    });

    it("overall is within 0-100", () => {
        const result = computeFiveVirtuesCoverage(["德育", "智育", "体育", "美育", "劳育"]);
        expect(result.overall).toBeGreaterThanOrEqual(0);
        expect(result.overall).toBeLessThanOrEqual(100);
    });
});
