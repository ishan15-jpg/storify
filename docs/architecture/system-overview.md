# Storify — System Overview

_Last updated: 2026-08-27_

## Context

Storify is a cloud-based storage SaaS MVP (similar to Google Drive) for storing, organizing, and sharing files, targeting individuals and small teams. It is a personal/learning project built with practical, production-oriented considerations. Key constraints include a 1GB maximum file size and strict downward inheritance for access control (Owner, Editor, Viewer). The system must guarantee zero data loss for files and strong ACID consistency for metadata, with metadata operations responding in `< 200ms`.

## Architecture Style

The system employs a **Traditional 3-Tier Architecture** at the macro level (Client → Backend API → Database + Blob Storage) to maintain complete control over centralized business logic and ensure predictable connection management.

Internally, the Backend API is structured using **Clean Architecture (Hexagonal / Ports and Adapters)**. This strict dependency inversion approach (where business logic depends on interfaces, not frameworks) was chosen specifically to isolate the core domain rules and maximize testability, serving the project's secondary goal of mastering Low-Level Design (LLD) principles despite the boilerplate overhead.

## System Components

- **Web Client:** A React/Next.js Single Page Application (SPA).
- **CDN / Frontend Hosting:** Vercel edge network for serving static assets.
- **API Gateway / Load Balancer:** Entry point for routing HTTPS traffic to the backend.
- **Backend API Service:** A Node.js + TypeScript (Express) application acting as the system's core processing engine, using `pg` for database access.
- **Background Worker Service:** A standalone Node.js + TypeScript background process for asynchronous maintenance and cleanup tasks.
- **Relational Database:** PostgreSQL with `ltree` extension for Materialized Path hierarchies and ULID primary keys.
- **Blob Storage:** AWS S3 (or Cloudflare R2).

## Component Responsibilities

- **Web Client:** Renders the dashboard UI, manages client-side state, and handles the actual byte-transfer of chunked, direct-to-cloud file uploads.
- **CDN / Frontend Hosting:** Exclusively hosts the compiled frontend code; no backend compute.
- **API Gateway / Load Balancer:** Handles SSL termination and distributes requests across healthy backend API containers.
- **Backend API Service:** Validates OAuth identity, acts as the absolute gatekeeper for authorization (enforcing Materialized Path permissions via application code), executes metadata CRUD via raw SQL (`pg`), and orchestrates binary storage by generating Pre-signed URLs. It explicitly does *not* handle file bytes.
- **Background Worker Service:** Operates independently from the HTTP API to poll PostgreSQL for abandoned `PENDING` uploads, invoke S3 cleanup/abort routines, and execute asynchronous cascaded deletions for large folder trees.
- **Relational Database:** Stores Users, Roles, Permissions, and file/folder metadata using 26-character ULID primary keys. Uses the `ltree` extension to manage the Materialized Path folder hierarchy and maintain ACID consistency.
- **Blob Storage:** Highly durable, fast binary storage exclusively responsible for storing and serving raw file chunks.

## Data Flow

The write and read paths for heavy data (file binaries) are decoupled from metadata:
- **Heavy Data (Direct-to-Cloud):** The Web Client exchanges bytes directly with Blob Storage using secure, time-limited Pre-signed URLs. The Backend API is completely bypassed during byte transfer.
- **Metadata:** All metadata reads/writes flow conventionally through the Backend API into the PostgreSQL database. The database acts as the strict source of truth for the folder hierarchy and file states.

## Request Flow

_Example: Uploading a File_
1. **Init:** Web Client issues `POST /files/upload-url` with target folder ID.
2. **API AuthZ:** The Backend API Controller passes the request to a Clean Architecture Use Case. The Use Case queries PostgreSQL to verify the user possesses `Editor` or `Owner` permissions on the target folder's Materialized Path.
3. **URL Generation:** Upon authorization, the Use Case calls an S3 Adapter to generate Pre-signed URLs for multipart upload.
4. **Metadata Placeholder:** A `File` record is saved to PostgreSQL with a `status: PENDING`.
5. **Direct Transfer:** The Client uses the URLs to upload bytes directly to S3.
6. **Finalize:** The Client notifies the API of completion. The API verifies the S3 object and updates the database record to `status: COMPLETED`.

## Asynchronous Flows

Due to the MVP scope (no transcoding or thumbnails), asynchronous flows are focused entirely on eventual consistency and garbage collection:
- **Orphaned File Cleanup:** A background worker polls PostgreSQL for stale `PENDING` file records (uploads the client abandoned) and purges the associated bytes from S3.
- **Mass Deletions:** When a user permanently deletes a large folder tree, the API instantly marks the root node as `DELETED` in PostgreSQL for a fast UI response. An asynchronous worker later traverses the descendants via the Materialized Path, permanently purging metadata and S3 objects to avoid locking the database during the request.

## External Dependencies

- **OAuth Provider (Google/Auth0):** Issues JWTs for user identity.
- **AWS S3 / Cloudflare R2:** Provides managed object storage. If unavailable, file uploads/downloads fail.
- **Managed PostgreSQL (RDS/Neon):** Provides durable metadata storage. If unavailable, the entire application suffers a hard outage.

## Failure Boundaries

- **Blob Storage Outage:** Degraded state. Users can log in, navigate folders, and view file metadata, but cannot upload or download file binaries.
- **Database Outage:** Total outage. The Backend API cannot authenticate users or resolve Materialized Paths.
- **Backend API Crash:** Highly available. The Load Balancer detects unresponsive containers and routes traffic to healthy instances.

## Scalability

- **Backend API:** Completely stateless (JWT-based auth). Scales horizontally by adding Docker containers.
- **Database:** Materialized Path B-Tree indexing ensures extremely fast reads (`< 200ms`). To prevent the horizontally scaling API from exhausting database connections, a connection pooler (e.g., PgBouncer) is required. Read Replicas can be introduced if read volume spikes.
- **Blob Storage:** Scales infinitely horizontally, managed entirely by the cloud provider.

## Security Boundaries

- **The Gatekeeper:** The Backend API holds the exclusive credentials to the PostgreSQL database and S3 buckets. Clients cannot access the data layer directly without a Pre-signed URL.
- **Application-Level Authorization:** Database-level Row Level Security (RLS) is disabled. All ownership and Materialized Path downward-inheritance permissions are strictly enforced within the Backend API's Clean Architecture Use Cases before returning any data.

## Deployment Model

- **Frontend:** Compiled and deployed globally via Vercel.
- **Backend API & Worker:** Containerized via Docker into separate images/services and deployed to a managed container platform (e.g., AWS ECS, Google Cloud Run, or Render).
- **CI/CD:** GitHub Actions orchestrates the pipeline, executing the fast, infrastructure-isolated Clean Architecture unit tests before building the Docker images and deploying to production.

## Observability

- **Logging:** Structured JSON logs are emitted by the Backend API for all requests.
- **Tracing:** Correlation IDs are injected at the API Gateway to trace a file upload's lifecycle from the initial URL request to the final asynchronous S3 verification.
- **Metrics:** Critical monitoring focuses on PostgreSQL connection pool utilization (to prevent starvation) and the P99 latency of Materialized Path queries (`ListFolder`, `MoveFolder`).
