import { describe, it, expect, vi, afterEach } from "vitest";
import { buildExportBundle } from "@/lib/export/exportService";

vi.mock("@/lib/db", () => ({
    __esModule: true,
    default: vi.fn(async () => ({})),
}));

const mockProject: any = {
    name: "Demo/Project 2025",
    config_version: "v1",
    stages: {
        Q2: {
            output: {
                report: "Philosophy report",
                keywords: ["value"],
                theory_fit_score: 88,
                table_rows: [{ key: "核心关键词", value: "创新" }],
            },
        },
        Q3: { output: { report: "Idea report" } },
    },
};

const mockConfig: any = {
    stages: [
        { stage_id: "Q2", name: "教育哲学", description: "定位教育哲学、关键词" },
        { stage_id: "Q3", name: "办学理念", description: "学校愿景与理念" },
    ],
};

vi.mock("@/models/Project", () => ({
    __esModule: true,
    default: {
        findById: vi.fn(() => ({
            lean: () => mockProject,
        })),
    },
}));

vi.mock("@/models/StageConfig", () => ({
    __esModule: true,
    default: {
        findOne: vi.fn(() => ({
            lean: () => mockConfig,
        })),
    },
}));

describe("Export bundle integration (mocked DB)", () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    it("builds a filtered text bundle with selected stages", async () => {
        const bundle = await buildExportBundle({
            projectId: "p1",
            format: "text",
            stages: ["Q2"],
        });

        expect(bundle.contentType).toContain("text/plain");
        expect(typeof bundle.body).toBe("string");
        const text = bundle.body as string;
        expect(text).toContain("Q2");
        expect(text).toContain("Philosophy report");
        expect(text).not.toContain("Idea report");
        expect(bundle.filename).toMatch(/Demo_Project_2025/);
    });

    it("builds a docx bundle buffer for all stages", async () => {
        const bundle = await buildExportBundle({
            projectId: "p1",
            format: "docx",
        });

        expect(bundle.contentType).toContain("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        expect(Buffer.isBuffer(bundle.body)).toBe(true);
        expect(bundle.filename.endsWith(".docx")).toBe(true);
    });
});
