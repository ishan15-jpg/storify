# 002. Enforce authorization in application layer instead of database row level security

## Status

Accepted

## Context

The Storify Product Requirements Document (PRD Section 3.4) initially specified using database Row Level Security (RLS) policies for access control. However, having selected a traditional 3-tier architecture, the backend API acts as an intermediary connecting to the database through a shared connection pool as a single privileged service account. The database engine does not inherently see individual end-user identities authenticating via JWT. We considered two options: (1) injecting session variables into each database transaction to evaluate database-level RLS, or (2) handling all authorization checks directly in the application layer.

## Decision

We will enforce all authorization and access control logic in the application layer (API code) and drop the requirement for database-level Row Level Security (RLS). The API will act as the sole gatekeeper: it will query the database for metadata and folder ancestry (Materialized Path), evaluate ownership and inheritance permissions in application code, and return data or reject requests with a 403 Forbidden.

## Consequences

- Resolves the identity mismatch caused by single-user database connection pooling in a 3-tier architecture without introducing transaction-level session variable injection overhead.
- Simplifies testing and mocking of authorization logic in unit and integration test suites.
- Requires strict diligence in the API codebase to ensure all data access routes consistently invoke the authorization checks before returning data.
- Deviates from the initial PRD specification regarding database-level RLS.
