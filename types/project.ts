/**
 * Project and Stage related types
 */

export interface StageExportSection {
    stageId: string;
    name: string;
    description?: string;
    status?: string;
    score?: number;
    keywords?: string[];
    content: string;
    tableRows?: Array<{ key: string; value: string }>;
}
