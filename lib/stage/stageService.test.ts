import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import fc from "fast-check";
import {
    StageService,
    VALID_STAGES,
    StageId,
    StageStatus,
} from "./stageService";

/**
 * Property-Based Tests for Stage Service
 * 
 * Tests the core logic of stage data management including:
 * - Stage input persistence
 * - Stage completion status
 * - Previous stages context
 * - Progress calculation
 */

// Create a mock project factory
function createMockProject(initialStages: Record<string, any> = {}) {
    return {
        _id: "test-project-id",
        stages: { ...initialStages },
        overall_progress: 0,
        markModified: vi.fn(),
        save: vi.fn().mockResolvedValue(undefined),
    };
}

// Mock the Project model
vi.mock("@/models/Project", () => {
    let mockProject: any = null;
    return {
        default: {
            findById: vi.fn().mockImplementation(() => Promise.resolve(mockProject)),
            __setMockProject: (project: any) => { mockProject = project; },
            __getMockProject: () => mockProject,
        },
    };
});

// Import the mocked module
import Project from "@/models/Project";

describe("Stage Service", () => {
    let service: StageService;
    let mockProject: ReturnType<typeof createMockProject>;

    beforeEach(() => {
        service = new StageService();
        mockProject = createMockProject();
        (Project as any).__setMockProject(mockProject);
    });


    /**
     * **Feature: stage-workflow, Property 1: Stage Input Persistence**
     * **Validates: Requirements 1.2, 2.2, 3.1**
     * 
     * For any stage and user input, if the input is saved, then retrieving 
     * the stage data should return the exact same input.
     */
    describe("Property 1: Stage Input Persistence", () => {
        it("should persist any valid stage input and retrieve it unchanged", async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate a random valid stage
                    fc.constantFrom(...VALID_STAGES),
                    // Generate random input object with various field types
                    fc.record({
                        textField: fc.string({ minLength: 0, maxLength: 200 }),
                        numberField: fc.integer({ min: -1000, max: 1000 }),
                        boolField: fc.boolean(),
                        arrayField: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
                    }),
                    async (stage, input) => {
                        // Reset mock project state for each test
                        mockProject = createMockProject();
                        (Project as any).__setMockProject(mockProject);

                        // Save input
                        await service.saveStageInput("test-project-id", stage, input);

                        // Retrieve stage data
                        const stageData = await service.getStageData("test-project-id", stage);

                        // Property: Retrieved input should match saved input exactly
                        return JSON.stringify(stageData.input) === JSON.stringify(input);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should update status to in_progress when saving input to not_started stage", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(...VALID_STAGES),
                    fc.record({
                        data: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    async (stage, input) => {
                        // Reset state - stage starts as not_started
                        mockProject = createMockProject();
                        (Project as any).__setMockProject(mockProject);

                        // Save input
                        await service.saveStageInput("test-project-id", stage, input);

                        // Get stage data
                        const stageData = await service.getStageData("test-project-id", stage);

                        // Property: Status should be in_progress after saving input
                        return stageData.status === "in_progress";
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should preserve existing status when saving input to in_progress or completed stage", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(...VALID_STAGES),
                    fc.constantFrom<StageStatus>("in_progress", "completed"),
                    fc.record({
                        data: fc.string({ minLength: 1, maxLength: 100 }),
                    }),
                    async (stage, initialStatus, input) => {
                        // Set initial state with existing status
                        mockProject = createMockProject({
                            [stage]: { status: initialStatus, input: { old: "data" } },
                        });
                        (Project as any).__setMockProject(mockProject);

                        // Save new input
                        await service.saveStageInput("test-project-id", stage, input);

                        // Get stage data
                        const stageData = await service.getStageData("test-project-id", stage);

                        // Property: Status should remain unchanged (not downgraded)
                        return stageData.status === initialStatus;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });


    /**
     * **Feature: stage-workflow, Property 2: Stage Completion Status**
     * **Validates: Requirements 1.5, 11.4**
     * 
     * For any stage, when marked as completed, the status should be "completed" 
     * and a completion timestamp should be recorded.
     */
    describe("Property 2: Stage Completion Status", () => {
        it("should set status to completed and record timestamp when completing a stage", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(...VALID_STAGES),
                    async (stage) => {
                        // Reset state
                        mockProject = createMockProject({
                            [stage]: { status: "in_progress", input: { data: "test" } },
                        });
                        (Project as any).__setMockProject(mockProject);

                        const beforeComplete = new Date();
                        
                        // Complete the stage
                        await service.completeStage("test-project-id", stage);

                        const afterComplete = new Date();

                        // Get stage data
                        const stageData = await service.getStageData("test-project-id", stage);

                        // Property 1: Status should be completed
                        const statusIsCompleted = stageData.status === "completed";

                        // Property 2: Completion timestamp should be recorded
                        const hasTimestamp = stageData.completed_at !== undefined;

                        // Property 3: Timestamp should be within the operation window
                        const timestampIsValid = stageData.completed_at !== undefined &&
                            stageData.completed_at >= beforeComplete &&
                            stageData.completed_at <= afterComplete;

                        return statusIsCompleted && hasTimestamp && timestampIsValid;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should maintain completed status even if completeStage is called multiple times", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(...VALID_STAGES),
                    fc.integer({ min: 2, max: 5 }),
                    async (stage, callCount) => {
                        // Reset state
                        mockProject = createMockProject({
                            [stage]: { status: "in_progress" },
                        });
                        (Project as any).__setMockProject(mockProject);

                        // Complete the stage multiple times
                        for (let i = 0; i < callCount; i++) {
                            await service.completeStage("test-project-id", stage);
                        }

                        // Get stage data
                        const stageData = await service.getStageData("test-project-id", stage);

                        // Property: Status should still be completed
                        return stageData.status === "completed";
                    }
                ),
                { numRuns: 100 }
            );
        });
    });


    /**
     * **Feature: stage-workflow, Property 3: Previous Stages Context Inclusion**
     * **Validates: Requirements 2.4, 3.5, 6.2**
     * 
     * For any stage Qn (where n > 1), the generation context should include 
     * outputs from all completed stages Q1 through Q(n-1).
     */
    describe("Property 3: Previous Stages Context Inclusion", () => {
        it("should include all completed previous stages in context", async () => {
            await fc.assert(
                fc.asyncProperty(
                    // Generate a stage index (1-9, since Q1 has no previous stages)
                    fc.integer({ min: 1, max: 9 }),
                    // Generate which previous stages are completed (as a bitmask)
                    fc.array(fc.boolean(), { minLength: 9, maxLength: 9 }),
                    async (currentStageIndex, completedMask) => {
                        const currentStage = VALID_STAGES[currentStageIndex];
                        
                        // Set up stages with random completion status
                        const stages: Record<string, any> = {};
                        const expectedCompletedStages: StageId[] = [];

                        for (let i = 0; i < currentStageIndex; i++) {
                            const stage = VALID_STAGES[i];
                            const isCompleted = completedMask[i];
                            
                            if (isCompleted) {
                                stages[stage] = {
                                    status: "completed",
                                    output: { content: `Output for ${stage}` },
                                    completed_at: new Date(),
                                };
                                expectedCompletedStages.push(stage);
                            } else {
                                stages[stage] = {
                                    status: "in_progress",
                                    input: { data: "some input" },
                                };
                            }
                        }

                        mockProject = createMockProject(stages);
                        (Project as any).__setMockProject(mockProject);

                        // Get previous stages context
                        const context = await service.getPreviousStagesContext(
                            "test-project-id",
                            currentStage
                        );

                        // Property 1: Context should contain exactly the completed stages
                        const contextStages = context.map(c => c.stage);
                        const hasAllCompleted = expectedCompletedStages.every(
                            stage => contextStages.includes(stage)
                        );
                        const hasOnlyCompleted = contextStages.every(
                            stage => expectedCompletedStages.includes(stage)
                        );

                        // Property 2: Each context entry should have output data
                        const allHaveOutput = context.every(c => c.output !== undefined);

                        return hasAllCompleted && hasOnlyCompleted && allHaveOutput;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should return empty context for Q1 stage", async () => {
            mockProject = createMockProject();
            (Project as any).__setMockProject(mockProject);
            
            const context = await service.getPreviousStagesContext("test-project-id", "Q1");
            
            expect(context).toEqual([]);
        });

        it("should preserve order of stages in context (Q1 before Q2, etc.)", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.integer({ min: 2, max: 9 }),
                    async (currentStageIndex) => {
                        const currentStage = VALID_STAGES[currentStageIndex];
                        
                        // Set up all previous stages as completed
                        const stages: Record<string, any> = {};
                        for (let i = 0; i < currentStageIndex; i++) {
                            const stage = VALID_STAGES[i];
                            stages[stage] = {
                                status: "completed",
                                output: { content: `Output for ${stage}` },
                            };
                        }

                        mockProject = createMockProject(stages);
                        (Project as any).__setMockProject(mockProject);

                        const context = await service.getPreviousStagesContext(
                            "test-project-id",
                            currentStage
                        );

                        // Property: Stages should be in order
                        for (let i = 1; i < context.length; i++) {
                            const prevIndex = VALID_STAGES.indexOf(context[i - 1].stage);
                            const currIndex = VALID_STAGES.indexOf(context[i].stage);
                            if (prevIndex >= currIndex) {
                                return false;
                            }
                        }
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });


    /**
     * **Feature: stage-workflow, Property 4: Progress Calculation**
     * **Validates: Requirements 11.4**
     * 
     * For any project, the overall progress percentage should equal 
     * (number of completed stages / 10) * 100.
     */
    describe("Property 4: Progress Calculation", () => {
        it("should calculate progress as (completed / 10) * 100", () => {
            fc.assert(
                fc.property(
                    // Generate a random subset of stages to be completed
                    fc.array(fc.constantFrom(...VALID_STAGES), { minLength: 0, maxLength: 10 }),
                    (completedStages) => {
                        // Remove duplicates
                        const uniqueCompleted = Array.from(new Set(completedStages));
                        
                        // Build stages object
                        const stages: Record<string, any> = {};
                        for (const stage of VALID_STAGES) {
                            if (uniqueCompleted.includes(stage)) {
                                stages[stage] = { status: "completed" };
                            } else {
                                stages[stage] = { status: "in_progress" };
                            }
                        }

                        // Calculate progress using the service method
                        const progress = service.calculateProgress(stages);

                        // Expected progress
                        const expectedProgress = (uniqueCompleted.length / 10) * 100;

                        // Property: Progress should match expected calculation
                        return progress === expectedProgress;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should return 0 for empty stages", () => {
            const progress = service.calculateProgress({});
            expect(progress).toBe(0);
        });

        it("should return 100 when all stages are completed", () => {
            const stages: Record<string, any> = {};
            for (const stage of VALID_STAGES) {
                stages[stage] = { status: "completed" };
            }
            
            const progress = service.calculateProgress(stages);
            expect(progress).toBe(100);
        });

        it("should only count completed stages, not in_progress or not_started", () => {
            fc.assert(
                fc.property(
                    // For each stage, generate a random status
                    fc.array(
                        fc.constantFrom<StageStatus>("not_started", "in_progress", "completed"),
                        { minLength: 10, maxLength: 10 }
                    ),
                    (statuses) => {
                        // Build stages object
                        const stages: Record<string, any> = {};
                        let completedCount = 0;
                        
                        for (let i = 0; i < VALID_STAGES.length; i++) {
                            stages[VALID_STAGES[i]] = { status: statuses[i] };
                            if (statuses[i] === "completed") {
                                completedCount++;
                            }
                        }

                        const progress = service.calculateProgress(stages);
                        const expectedProgress = (completedCount / 10) * 100;

                        // Property: Only completed stages should count
                        return progress === expectedProgress;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should update project progress when completing a stage", async () => {
            await fc.assert(
                fc.asyncProperty(
                    fc.constantFrom(...VALID_STAGES),
                    fc.integer({ min: 0, max: 9 }),
                    async (stageToComplete, initialCompletedCount) => {
                        // Set up initial state with some completed stages
                        const stages: Record<string, any> = {};
                        
                        let alreadyCompleted = 0;
                        for (let i = 0; i < VALID_STAGES.length; i++) {
                            const stage = VALID_STAGES[i];
                            if (i < initialCompletedCount && stage !== stageToComplete) {
                                stages[stage] = { status: "completed" };
                                alreadyCompleted++;
                            } else if (stage === stageToComplete) {
                                stages[stage] = { status: "in_progress" };
                            } else {
                                stages[stage] = { status: "not_started" };
                            }
                        }

                        mockProject = createMockProject(stages);
                        mockProject.overall_progress = 0;
                        (Project as any).__setMockProject(mockProject);

                        // Complete the stage
                        await service.completeStage("test-project-id", stageToComplete);

                        // Property: Progress should be updated correctly
                        const expectedCompleted = alreadyCompleted + 1;
                        const expectedProgress = (expectedCompleted / 10) * 100;
                        
                        return mockProject.overall_progress === expectedProgress;
                    }
                ),
                { numRuns: 100 }
            );
        });
    });
});

/**
 * Unit tests for edge cases and error handling
 */
describe("Stage Service - Unit Tests", () => {
    let service: StageService;
    let mockProject: ReturnType<typeof createMockProject>;

    beforeEach(() => {
        service = new StageService();
        mockProject = createMockProject();
        (Project as any).__setMockProject(mockProject);
    });

    it("should throw error for invalid stage identifier", async () => {
        await expect(
            service.getStageData("test-project-id", "Q11" as StageId)
        ).rejects.toThrow("Invalid stage: Q11");
    });

    it("should throw error for lowercase stage identifier", async () => {
        await expect(
            service.getStageData("test-project-id", "q1" as StageId)
        ).rejects.toThrow("Invalid stage: q1");
    });

    it("should return not_started status for uninitialized stage", async () => {
        mockProject = createMockProject();
        (Project as any).__setMockProject(mockProject);
        
        const stageData = await service.getStageData("test-project-id", "Q1");
        
        expect(stageData.status).toBe("not_started");
        expect(stageData.input).toBeUndefined();
        expect(stageData.output).toBeUndefined();
    });

    it("should save diagnostic score with output", async () => {
        mockProject = createMockProject({ Q1: { status: "in_progress" } });
        (Project as any).__setMockProject(mockProject);
        
        const output = { content: "Generated content" };
        const diagnosticScore = {
            overall: 85,
            dimensions: { strengths: 90, weaknesses: 80 },
        };

        await service.saveStageOutput("test-project-id", "Q1", output, diagnosticScore);

        const stageData = await service.getStageData("test-project-id", "Q1");
        
        expect(stageData.output).toEqual(output);
        expect(stageData.diagnostic_score).toEqual(diagnosticScore);
    });
});
