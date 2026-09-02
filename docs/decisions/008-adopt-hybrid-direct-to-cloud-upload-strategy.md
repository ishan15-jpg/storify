# 008. Adopt hybrid direct-to-cloud upload strategy with backend multipart orchestration

## Status

Accepted

## Context

Storify supports file uploads up to 1GB using direct-to-cloud transfers to AWS S3 / Cloudflare R2 via Pre-signed URLs. We needed to define the upload lifecycle and chunking boundary:
1. **Uniform Multipart Upload for All Files:** Even small files (< 10MB) execute S3 `CreateMultipartUpload`, issue part URLs, and complete multipart upload.
2. **Hybrid Direct-to-Cloud Upload Strategy:** Small files (< 10MB) use a single Pre-signed `PUT` URL, while large files (≥ 10MB) use S3 Multipart chunking (10MB parts) with backend orchestration.

Uniform multipart upload introduces unnecessary network roundtrips and latency overhead for small files and images. Additionally, client-side IAM credential exposure must be avoided, requiring the Backend API to securely orchestrate S3 multipart initialization and completion.

## Decision

We will adopt a **hybrid direct-to-cloud upload strategy** with a 10MB threshold and backend multipart orchestration:
- **Files < 10MB:** The Backend API issues a single Pre-signed `PUT` URL. The client uploads the byte payload directly to S3 and calls `POST /files/:id/complete` where the API verifies object existence via `HeadObject` before setting status to `COMPLETED`.
- **Files ≥ 10MB:** The Backend API initiates S3 `CreateMultipartUpload`, returns Pre-signed URLs for each 10MB part, and client streams chunks directly to S3. The client submits part ETags to `POST /files/:id/complete`, where the Backend API securely executes `CompleteMultipartUploadCommand` and updates PostgreSQL status to `COMPLETED`.

## Consequences

- Low-latency single-request uploads for small files, avoiding multipart setup overhead.
- High-throughput, resilient chunked streaming for large files up to 1GB with pause/resume and retry capabilities.
- Secrets and IAM credentials remain strictly within the Backend API layer without leaking to the browser client.
- The Backend API and Background Worker share responsibility for cleaning up incomplete multipart uploads if clients abandon the transfer.
