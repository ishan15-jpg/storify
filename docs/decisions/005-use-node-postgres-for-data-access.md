# 005. Use node-postgres for database data access

## Status

Accepted

## Context

Having adopted Clean Architecture (ADR 003) for the backend API, we needed to select a data access library for the PostgreSQL repository adapters in `src/infrastructure/database/repositories/`. We evaluated:
1. **Full-featured ORMs (Prisma, TypeORM):** Provide schema migrations and object mapping, but often introduce heavy abstraction overhead, generate complex subqueries, and struggle with custom PostgreSQL-specific data types and operators such as `ltree` (`@>`, `<@`, `~`).
2. **TypeScript Query Builders (Kysely, Knex):** Type-safe query building, but require custom extension typing for `ltree` operators.
3. **Native Database Driver (`pg` / node-postgres):** Direct, lightweight connection pooling and raw parameterized SQL execution.

Given our commitment to Clean Architecture, domain entities are cleanly decoupled from database models. Full ORMs add unnecessary abstraction layers and make low-level `ltree` hierarchical SQL expressions harder to optimize and inspect.

## Decision

We will use the native **`pg` (node-postgres)** library pool for all database interactions within repository adapters. 

Raw parameterized SQL queries will be encapsulated inside Clean Architecture database repository adapters that implement domain repository ports (`IFolderRepository`, `IFileRepository`, etc.).

## Consequences

- Full, unconstrained control over raw SQL execution and specialized PostgreSQL `ltree` operators without ORM impedance mismatch.
- Lightweight runtime with zero heavyweight ORM overhead or complex code generation build steps.
- Clear separation: SQL queries, database row mapping, and connection handling remain strictly isolated within infrastructure adapters.
- Developers must manually write and maintain SQL schema migrations, queries, and row-to-entity mappers rather than relying on automatic ORM schema synchronization.
