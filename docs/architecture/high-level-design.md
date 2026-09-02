# High-Level Architecture Diagram

This document contains the high-level architecture diagram for the Storify system, illustrating the Traditional 3-Tier macro-architecture and the direct-to-cloud data flows.

```mermaid
flowchart TB
    subgraph Client_Layer ["Client Layer"]
        Browser["Web Client (Next.js SPA)"]
    end

    subgraph Edge_Network ["Edge / CDN"]
        Static["Vercel CDN (Hosts Static Frontend)"]
    end

    subgraph Application_Layer ["Application Layer (Backend)"]
        LB["API Gateway / Load Balancer (SSL Termination)"]
        subgraph Clean_Arch ["Backend API Service"]
            API["Node.js + TS Express (Clean Architecture Core)"]
            AuthZ["Gatekeeper / AuthZ (Materialized Path Checks)"]
            API --- AuthZ
        end
    end

    subgraph Data_Storage_Layer ["Data & Storage Layer"]
        DB[("Relational DB: PostgreSQL + ltree")]
        Blob[("Blob Storage: AWS S3 / Cloudflare R2")]
    end

    %% Client fetching static assets
    Browser -.-> |"1. Fetches UI Assets"| Static

    %% Client to API interactions (Metadata & Auth)
    Browser <--> |"2. HTTPS/REST (Auth, Metadata, Request Presigned URLs)"| LB
    LB <--> Clean_Arch

    %% API to DB (ACID Metadata)
    Clean_Arch <--> |"3. SQL (Read/Write Metadata, Verify Permissions)"| DB

    %% API to Blob Storage (Management)
    Clean_Arch -.-> |"4. Generate Presigned URLs"| Blob

    %% Direct Client to Blob Storage (Heavy Data)
    Browser <======> |"5. Direct Chunked Uploads & Downloads"| Blob

    %% Async Worker Flow
    subgraph Background_Workers ["Async Workers"]
        Worker["Cleanup Worker (Orphaned Files / Mass Deletes)"]
    end
    Worker -.-> |"Polls PENDING / DELETED"| DB
    Worker -.-> |"Purges Bytes"| Blob

    %% Styling
    classDef default fill:#f9f9f9,stroke:#333,stroke-width:1px;
    classDef highlight fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef worker fill:#fff3e0,stroke:#f57c00,stroke-width:1px,stroke-dasharray: 5 5;
    class Browser highlight
    class Clean_Arch highlight
    class DB highlight
    class Blob highlight
    class Worker worker
```

## Flow Description
1. **Asset Delivery:** The user's browser fetches the Next.js frontend from the Vercel CDN.
2. **API Requests:** The client communicates with the Backend API (via a Load Balancer) for authentication, browsing folders, and requesting permission to upload/download files.
3. **Database Interactions:** The Backend API acts as the sole gatekeeper, querying PostgreSQL to verify Materialized Path inheritance permissions before acting.
4. **URL Orchestration:** To handle large 1GB files without choking the backend, the API calls the Blob Storage provider to generate secure, time-limited Pre-signed URLs.
5. **Direct-to-Cloud Transfer:** The client uses the Pre-signed URLs to stream bytes directly to and from Blob Storage, completely bypassing the Backend API for heavy lifting.
6. **Async Cleanup:** Background workers periodically sweep the database for abandoned (PENDING) uploads or large folder deletion requests, purging the corresponding bytes from Blob Storage without impacting real-time API performance.
