import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import fc from "fast-check";
import { Types } from "mongoose";

/**
 * Property-Based Tests for StageVersion Model
 * 
 * Tests the core logic of version management including:
 * - Version creation with auto-increment
 * - AI-generated version metadata validation
 * - Version history retrieval
 * 
 * **Feature: stage-workflow, Property 5: Version Creation on Generation**
 * **Validates: Requirements 15.1**
 */

// Import types and validation functions from the model
import {
    VALID_STAGES,
    StageId,
    IVersionAuthor,
    IGenerationMetadata,
    CreateVersionInput,
    validateVersionInput,
    isValidStage,
    ITokenUsage,
    IRagResultRef,
} from "./StageVersion";

// Arbitrary generators for property tests
const stageArb = fc.constantFrom(...VALID_STAGES);

const objectIdArb: fc.Arbitrary<Types.ObjectId> = fc.string({ 
    minLength: 24, 
    maxLength: 24,
    unit: fc.constantFrom(...'0123456789abcdef'.split(''))
}).map(
    (hex: string) => new Types.ObjectId(hex.padEnd(24, '0').slice(0, 24))
);

const authorArb: fc.Arbitrary<IVersionAuthor> = fc.record({
    user_id: fc.string({ minLength: 1, maxLength: 50 }),
    name: fc.string({ minLength: 1, maxLength: 100 }),
});

const tokenUsageArb: fc.Arbitrary<ITokenUsage> = fc.record({
    promptTokens: fc.integer({ min: 0, max: 10000 }),
    completionTokens: fc.integer({ min: 0, max: 10000 }),
    totalTokens: fc.integer({ min: 0, max: 20000 }),
});

const ragResultArb: fc.Arbitrary<IRagResultRef> = fc.record({
    document_id: fc.string({ minLength: 1, maxLength: 50 }),
    chunk_id: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    score: fc.float({ min: 0, max: 1 }),
    content_preview: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
});

const generationMetadataArb: fc.Arbitrary<IGenerationMetadata> = fc.record({
    prompt_used: fc.string({ minLength: 1, maxLength: 1000 }),
    rag_results: fc.array(ragResultArb, { minLength: 0, maxLength: 5 }),
    token_usage: tokenUsageArb,
    model: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    temperature: fc.option(fc.float({ min: 0, max: 2 }), { nil: undefined }),
});

const contentArb = fc.record({
    text: fc.string({ minLength: 0, maxLength: 500 }),
    data: fc.dictionary(fc.string(), fc.string()),
});

/**
 * Mock version storage for testing version creation logic
 */
class MockVersionStore {
    private versions: Map<string, any[]> = new Map();

    clear() {
        this.versions.clear();
    }

    getKey(projectId: string | Types.ObjectId, stage: StageId): string {
        return `${projectId.toString()}-${stage}`;
    }

    getNextVersionNumber(projectId: string | Types.ObjectId, stage: StageId): number {
        const key = this.getKey(projectId, stage);
        const versions = this.versions.get(key) || [];
        if (versions.length === 0) return 1;
        const maxVersion = Math.max(...versions.map(v => v.version));
        return maxVersion + 1;
    }

    createVersion(input: CreateVersionInput): any {
        // Validate input
        validateVersionInput(input);

        const key = this.getKey(input.project_id, input.stage);
        if (!this.versions.has(key)) {
            this.versions.set(key, []);
        }

        const nextVersion = this.getNextVersionNumber(input.project_id, input.stage);
        const versionDoc = {
            ...input,
            version: nextVersion,
            created_at: new Date(),
        };

        this.versions.get(key)!.push(versionDoc);
        return versionDoc;
    }

    getVersionHistory(projectId: string | Types.ObjectId, stage: StageId, limit: number = 20): any[] {
        const key = this.getKey(projectId, stage);
        const versions = this.versions.get(key) || [];
        return [...versions]
            .sort((a, b) => b.version - a.version)
            .slice(0, limit);
    }

    getVersion(projectId: string | Types.ObjectId, stage: StageId, version: number): any | null {
        const key = this.getKey(projectId, stage);
        const versions = this.versions.get(key) || [];
        return versions.find(v => v.version === version) || null;
    }
}

describe("StageVersion Model", () => {
    let store: MockVersionStore;

    beforeEach(() => {
        store = new MockVersionStore();
    });

    /**
     * **Feature: stage-workflow, Property 5: Version Creation on Generation**
     * **Validates: Requirements 15.1**
     * 
     * For any AI generation, a new version should be created with 
     * is_ai_generated=true and generation metadata.
     */
    describe("Property 5: Version Creation on Generation", () => {
        it("should create AI-generated version with is_ai_generated=true and metadata", () => {
            fc.assert(
                fc.property(
                    objectIdArb,
                    stageArb,
                    contentArb,
                    authorArb,
                    generationMetadataArb,
                    (projectId, stage, content, author, generationMetadata) => {
                        store.clear();
                        
                        const input: CreateVersionInput = {
                            project_id: projectId,
                            stage,
                            content,
                            author,
                            is_ai_generated: true,
                            generation_metadata: generationMetadata,
                        };

                        // Create version
                        const version = store.createVersion(input);

                        // Property 1: is_ai_generated should be true
                        const hasAiFlag = version.is_ai_generated === true;

                        // Property 2: generation_metadata should be present
                        const hasMetadata = version.generation_metadata !== undefined;

                        // Property 3: metadata should contain required fields
                        const metadataValid = version.generation_metadata !== undefined &&
                            typeof version.generation_metadata.prompt_used === "string" &&
                            Array.isArray(version.generation_metadata.rag_results) &&
                            version.generation_metadata.token_usage !== undefined;

                        return hasAiFlag && hasMetadata && metadataValid;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should reject AI-generated version without generation_metadata", () => {
            fc.assert(
                fc.property(
                    objectIdArb,
                    stageArb,
                    contentArb,
                    authorArb,
                    (projectId, stage, content, author) => {
                        const input: CreateVersionInput = {
                            project_id: projectId,
                            stage,
                            content,
                            author,
                            is_ai_generated: true,
                            // Missing generation_metadata
                        };

                        // Property: Should throw error for AI version without metadata
                        expect(() => validateVersionInput(input)).toThrow(
                            "AI-generated versions must include generation_metadata"
                        );
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should allow manual version without generation_metadata", () => {
            fc.assert(
                fc.property(
                    objectIdArb,
                    stageArb,
                    contentArb,
                    authorArb,
                    (projectId, stage, content, author) => {
                        const input: CreateVersionInput = {
                            project_id: projectId,
                            stage,
                            content,
                            author,
                            is_ai_generated: false,
                            // No generation_metadata needed for manual versions
                        };

                        // Property: Should not throw for manual version
                        expect(() => validateVersionInput(input)).not.toThrow();
                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should auto-increment version number for each new version", () => {
            fc.assert(
                fc.property(
                    objectIdArb,
                    stageArb,
                    fc.integer({ min: 1, max: 10 }),
                    (projectId, stage, versionCount) => {
                        store.clear();

                        const versions: number[] = [];

                        // Create multiple versions
                        for (let i = 0; i < versionCount; i++) {
                            const input: CreateVersionInput = {
                                project_id: projectId,
                                stage,
                                content: { iteration: i },
                                author: { user_id: "test", name: "Test User" },
                                is_ai_generated: false,
                            };

                            const version = store.createVersion(input);
                            versions.push(version.version);
                        }

                        // Property: Versions should be sequential starting from 1
                        for (let i = 0; i < versions.length; i++) {
                            if (versions[i] !== i + 1) {
                                return false;
                            }
                        }

                        return true;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should record author information for each version", () => {
            fc.assert(
                fc.property(
                    objectIdArb,
                    stageArb,
                    contentArb,
                    authorArb,
                    fc.boolean(),
                    fc.option(generationMetadataArb, { nil: undefined }),
                    (projectId, stage, content, author, isAiGenerated, metadata) => {
                        store.clear();

                        // Only include metadata if AI-generated
                        const input: CreateVersionInput = {
                            project_id: projectId,
                            stage,
                            content,
                            author,
                            is_ai_generated: isAiGenerated,
                            generation_metadata: isAiGenerated ? (metadata || {
                                prompt_used: "test",
                                rag_results: [],
                                token_usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
                            }) : undefined,
                        };

                        const version = store.createVersion(input);

                        // Property: Author should match input
                        return version.author.user_id === author.user_id &&
                            version.author.name === author.name;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should record created_at timestamp for each version", () => {
            fc.assert(
                fc.property(
                    objectIdArb,
                    stageArb,
                    contentArb,
                    authorArb,
                    (projectId, stage, content, author) => {
                        store.clear();

                        const beforeCreate = new Date();

                        const input: CreateVersionInput = {
                            project_id: projectId,
                            stage,
                            content,
                            author,
                            is_ai_generated: false,
                        };

                        const version = store.createVersion(input);

                        const afterCreate = new Date();

                        // Property: created_at should be within the operation window
                        return version.created_at >= beforeCreate &&
                            version.created_at <= afterCreate;
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should preserve content exactly as provided", () => {
            fc.assert(
                fc.property(
                    objectIdArb,
                    stageArb,
                    contentArb,
                    authorArb,
                    (projectId, stage, content, author) => {
                        store.clear();

                        const input: CreateVersionInput = {
                            project_id: projectId,
                            stage,
                            content,
                            author,
                            is_ai_generated: false,
                        };

                        const version = store.createVersion(input);

                        // Property: Content should match input exactly
                        return JSON.stringify(version.content) === JSON.stringify(content);
                    }
                ),
                { numRuns: 100 }
            );
        });

        it("should maintain separate version sequences per project/stage", () => {
            fc.assert(
                fc.property(
                    objectIdArb,
                    objectIdArb,
                    stageArb,
                    stageArb,
                    (projectId1, projectId2, stage1, stage2) => {
                        store.clear();

                        // Create versions for project1/stage1
                        const v1 = store.createVersion({
                            project_id: projectId1,
                            stage: stage1,
                            content: { test: 1 },
                            author: { user_id: "u1", name: "User 1" },
                            is_ai_generated: false,
                        });

                        // Create versions for project2/stage2
                        const v2 = store.createVersion({
                            project_id: projectId2,
                            stage: stage2,
                            content: { test: 2 },
                            author: { user_id: "u2", name: "User 2" },
                            is_ai_generated: false,
                        });

                        // Property: Both should be version 1 (separate sequences)
                        // unless they're the same project/stage combination
                        const sameProjectStage = 
                            projectId1.toString() === projectId2.toString() && 
                            stage1 === stage2;

                        if (sameProjectStage) {
                            return v1.version === 1 && v2.version === 2;
                        } else {
                            return v1.version === 1 && v2.version === 1;
                        }
                    }
                ),
                { numRuns: 100 }
            );
        });
    });

    /**
     * Unit tests for helper functions
     */
    describe("Helper Functions", () => {
        it("isValidStage should return true for valid stages", () => {
            for (const stage of VALID_STAGES) {
                expect(isValidStage(stage)).toBe(true);
            }
        });

        it("isValidStage should return false for invalid stages", () => {
            expect(isValidStage("Q0")).toBe(false);
            expect(isValidStage("Q11")).toBe(false);
            expect(isValidStage("q1")).toBe(false);
            expect(isValidStage("")).toBe(false);
            expect(isValidStage("invalid")).toBe(false);
        });

        it("getNextVersionNumber should return 1 for new project/stage", () => {
            const projectId = new Types.ObjectId();
            const nextVersion = store.getNextVersionNumber(projectId, "Q1");
            expect(nextVersion).toBe(1);
        });

        it("getNextVersionNumber should return incremented version", () => {
            const projectId = new Types.ObjectId();
            
            // Add existing versions
            store.createVersion({
                project_id: projectId,
                stage: "Q1",
                content: { v: 1 },
                author: { user_id: "test", name: "Test" },
                is_ai_generated: false,
            });
            store.createVersion({
                project_id: projectId,
                stage: "Q1",
                content: { v: 2 },
                author: { user_id: "test", name: "Test" },
                is_ai_generated: false,
            });
            store.createVersion({
                project_id: projectId,
                stage: "Q1",
                content: { v: 3 },
                author: { user_id: "test", name: "Test" },
                is_ai_generated: false,
            });

            const nextVersion = store.getNextVersionNumber(projectId, "Q1");
            expect(nextVersion).toBe(4);
        });

        it("getVersionHistory should return versions in descending order", () => {
            const projectId = new Types.ObjectId();
            
            // Create multiple versions
            for (let i = 0; i < 5; i++) {
                store.createVersion({
                    project_id: projectId,
                    stage: "Q1",
                    content: { iteration: i },
                    author: { user_id: "test", name: "Test" },
                    is_ai_generated: false,
                });
            }

            const history = store.getVersionHistory(projectId, "Q1");
            
            expect(history.length).toBe(5);
            // Should be in descending order
            for (let i = 0; i < history.length - 1; i++) {
                expect(history[i].version).toBeGreaterThan(history[i + 1].version);
            }
        });

        it("getVersionHistory should respect limit parameter", () => {
            const projectId = new Types.ObjectId();
            
            // Create 10 versions
            for (let i = 0; i < 10; i++) {
                store.createVersion({
                    project_id: projectId,
                    stage: "Q1",
                    content: { iteration: i },
                    author: { user_id: "test", name: "Test" },
                    is_ai_generated: false,
                });
            }

            const history = store.getVersionHistory(projectId, "Q1", 3);
            
            expect(history.length).toBe(3);
            // Should be the most recent 3 versions
            expect(history[0].version).toBe(10);
            expect(history[1].version).toBe(9);
            expect(history[2].version).toBe(8);
        });

        it("getVersion should return specific version", () => {
            const projectId = new Types.ObjectId();
            
            // Create multiple versions
            for (let i = 0; i < 5; i++) {
                store.createVersion({
                    project_id: projectId,
                    stage: "Q1",
                    content: { iteration: i },
                    author: { user_id: "test", name: "Test" },
                    is_ai_generated: false,
                });
            }

            const version = store.getVersion(projectId, "Q1", 3);
            
            expect(version).not.toBeNull();
            expect(version!.version).toBe(3);
            expect(version!.content.iteration).toBe(2); // 0-indexed
        });

        it("getVersion should return null for non-existent version", () => {
            const projectId = new Types.ObjectId();
            
            const version = store.getVersion(projectId, "Q1", 999);
            
            expect(version).toBeNull();
        });
    });
});
