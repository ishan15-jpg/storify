# 004. Use ULID for resource identifiers and ltree materialized paths

## Status

Accepted

## Context

The Storify platform utilizes PostgreSQL's `ltree` extension to model infinitely nested folder hierarchies via Materialized Paths. However, the `ltree` data type enforces strict label formatting constraints: each label must consist solely of alphanumeric characters and underscores (`[A-Za-z0-9_]`) and cannot contain hyphens.

We evaluated four strategies for primary key identifiers and `ltree` path construction:
1. **Standard UUIDv4 / UUIDv7 with hyphen stripping:** Stored as native `uuid`, but stripped of hyphens (`c9bf9e5716854c89bafbff5af830be8a`) when concatenated into `ltree` paths.
2. **NanoID / CUID2:** Custom alphanumeric strings without hyphens.
3. **Universally Unique Lexicographically Sortable Identifier (ULID):** 128-bit identifiers encoded in a 26-character Crockford Base32 alphabet (`[0-9A-HJKMNP-TV-Z]`).
4. **Auto-incrementing Integers (BigInt) with Application Hashids/Sqids:** Integers in the database and `ltree` (`1.45.1092`), obfuscated into alphanumeric strings in the API layer before exposing to clients.

While BigInt with Hashids offers the smallest database storage footprint, it introduces high application-layer mapping complexity (a leaky abstraction prone to developer oversight) and prevents decentralized, client/API-side ID generation. Standard UUIDv4 and NanoIDs cause significant B-Tree index fragmentation and page splits under high write volume due to random distribution, while UUIDs additionally require custom hyphen manipulation in the application adapters.

## Decision

We will use **ULIDs** (Universally Unique Lexicographically Sortable Identifiers) as the primary key format across resources (Folders, Files, Users, etc.) and as the label format in PostgreSQL `ltree` paths.

ULIDs naturally satisfy `ltree`'s label format without hyphen transformations, allow decentralized ID generation before database insertion, and feature a 48-bit timestamp prefix that guarantees sequential B-Tree index inserts, mitigating index fragmentation.

## Consequences

- Direct 1:1 match between resource primary keys and `ltree` path components with zero serialization/deserialization boilerplate in the application layer.
- Enables decentralized ID generation by both client and backend use cases before committing transactions.
- Preserves database write performance at scale by avoiding B-Tree index page splits.
- Primary keys in PostgreSQL must be stored as 26-character strings (`VARCHAR(26)` or `CHAR(26)`) rather than native 16-byte `uuid` or 8-byte `bigint` types, marginally increasing row width.
