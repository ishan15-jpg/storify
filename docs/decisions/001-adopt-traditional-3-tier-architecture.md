# 001. Adopt traditional 3-tier architecture

## Status

Accepted

## Context

For the Storify MVP (a cloud-based storage SaaS similar to Google Drive), we evaluated three high-level system architectures: (1) BaaS-centric architecture (e.g., Supabase/Firebase) using database-level Row Level Security, (2) Traditional 3-Tier architecture with a custom backend API layer, and (3) Event-Driven / Serverless functions architecture. Key project requirements include direct-to-cloud 1GB uploads, fast metadata operations (< 200ms), and strict access control.

## Decision

We will adopt a traditional 3-tier architecture with a custom backend API service mediating between client applications and the data/blob storage layers. We choose this approach over BaaS and Serverless to maintain centralized control over business logic, isolate the database behind an application layer, facilitate straightforward testing, enable rich observability, and maintain warm database connection pools.

## Consequences

- Business logic is fully centralized in code, avoiding vendor lock-in and making future public API exposition straightforward.
- Testing is easier because application-level logic can be unit-tested and mocked without running a live database.
- Better observability and profiling capabilities through traditional APM, distributed tracing, and custom logging tools.
- Avoids serverless cold-start latency and connection exhaustion, ensuring metadata operations reliably meet the < 200ms latency target.
- Increases development time and operational burden compared to BaaS, requiring us to manage backend hosting, deployments, scaling, and database connection pooling.
