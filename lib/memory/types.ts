/**
 * Memory System Types — Phase 5
 */

export type MemoryType = 'fact' | 'preference' | 'entity' | 'instruction' | 'summary';

export interface Memory {
    id: string;
    tenantId: string;
    sessionId: string | null;
    sourceRequestId: string | null;
    memoryType: MemoryType;
    content: string;
    importance: number;
    expiresAt: string | null;
    createdAt: string;
}

export interface MemorySearchResult extends Memory {
    score: number;
}

export interface ExtractedMemory {
    memoryType: MemoryType;
    content: string;
    /** 0–1 importance assigned by the extractor */
    importance: number;
}
