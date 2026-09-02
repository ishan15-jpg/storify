# Technology Stack

This document outlines the tools and technologies chosen to implement the Storify MVP. The stack is optimized for a production-ready application using Clean Architecture on the backend.

| System Layer | Technology | Primary Purpose |
| :--- | :--- | :--- |
| **Frontend Client** | **Next.js (React)** | Server-side rendering, robust routing, and complex state management for the web dashboard. |
| **Backend API** | **Node.js + TypeScript (Express)** | Core API service. TypeScript provides the strict typing necessary for Clean Architecture interfaces/ports. |
| **Data Access Library** | **`pg` (node-postgres)** | Native PostgreSQL client pool for Clean Architecture database repository adapters. |
| **Database** | **PostgreSQL** | Relational metadata storage. Utilizes the `ltree` extension for efficient Materialized Path (folder hierarchy) queries. |
| **Blob Storage** | **AWS S3** (or Cloudflare R2) | Durable object storage for raw file binaries (up to 1GB chunked direct-uploads). |
| **Background Worker** | **Node.js + TypeScript (Standalone Worker)** | Separate independent background service for sweeping stale `PENDING` uploads and cascading permanent folder deletions. |
| **Backend Hosting** | **Docker + Managed Container Service** (e.g., AWS ECS, Cloud Run, or Render) | Stateless, horizontally scalable hosting for the containerized API and worker services. |
| **Frontend Hosting** | **Vercel** | Optimized global CDN and Edge hosting specifically tailored for Next.js applications. |
