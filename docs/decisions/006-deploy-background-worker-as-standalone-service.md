# 006. Deploy background worker as a standalone service

## Status

Accepted

## Context

The Storify platform requires background processing for tasks that should not block HTTP request cycles:
1. Sweeping and cleaning up orphaned `PENDING` file records and aborting uncompleted multipart S3 uploads.
2. Cascading permanent deletions of large folder subtrees and associated S3 objects.

We considered two execution models:
1. **In-Process Timers / Interval Jobs:** Running scheduled tasks (`setInterval` or `node-cron`) directly inside the Express API container process.
2. **Standalone Worker Service:** Running background workers as an independent Node.js process / container separate from the Express HTTP API.

While in-process execution is simpler for single-instance deployments, it creates concurrency bottlenecks, CPU/memory contention with user-facing HTTP requests, and duplicate cron execution issues when the API service scales horizontally across multiple containers behind a load balancer.

## Decision

We will implement and deploy the background worker as an **independent, standalone service** separate from the main Express API application.

The worker will share domain entities and repository interfaces with the core codebase, but will execute as an isolated Node.js runtime container focused strictly on asynchronous sweeps and cleanup jobs.

## Consequences

- Isolates heavy database and S3 cleanup operations from user-facing API request lifecycles, preventing latency spikes on HTTP endpoints.
- Avoids duplicate job execution when the API layer scales horizontally across multiple container instances.
- Independent scaling and resource allocation for the worker service based on asynchronous workload demand.
- Requires maintaining a separate entry point and deployment configuration (e.g. separate Docker container / service definition).
