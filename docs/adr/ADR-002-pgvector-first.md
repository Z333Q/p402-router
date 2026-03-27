# ADR-002: Use pgvector Before External Vector DB

**Date:** 2026-03-26
**Status:** Accepted

## Context

Phase 1 (Retrieval Service) requires a vector index for embedding storage and similarity search. Options considered:

1. pgvector extension on the existing Neon PostgreSQL instance
2. Pinecone (managed vector DB)
3. Weaviate (self-hosted or managed)
4. Qdrant (self-hosted or managed)

## Decision

Start with the `vector` extension on Neon PostgreSQL. Use HNSW indexing (`vector_cosine_ops`). Do not introduce a dedicated vector store until scale forces it.

The existing semantic cache already uses pgvector for response deduplication with `text-embedding-004`. The retrieval system extends this infrastructure rather than creating a parallel system. Both use the same Neon instance, the same `pg` pool in `lib/db.ts`, and the same HNSW index approach.

If corpus size exceeds 10M chunks or query latency p95 exceeds 500ms under production load, revisit this decision and migrate to a dedicated store.

## Consequences

- Zero new infrastructure to manage
- Single connection pool, single transaction scope
- Embedding model decision is decoupled from storage decision
- Vertical scale limit is Neon's max storage tier (~1TB)
- Migration to dedicated vector store is possible but will require an embedding re-export step
