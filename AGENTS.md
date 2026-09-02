# Agent Guidelines for Storify

This document guides AI coding agents working on the Storify repository. Follow these conventions, architectural boundaries, and workflows before making any modifications to the codebase.

---

## 1. Documentation to Consult First

Before planning or executing changes, consult the following authoritative documents:

- **Product Requirements & Scope:** [requirements.md](docs/product/requirements.md)
- **Implementation Roadmap & Milestones:** [roadmap.md](docs/development/roadmap.md)
- **Full System Overview:** [system-overview.md](docs/architecture/system-overview.md)
- **High-Level Design & Data Flows:** [high-level-design.md](docs/architecture/high-level-design.md)
- **Database Schema & Indexing:** [db-schema.md](docs/database/db-schema.md)
- **REST API & OpenAPI Specifications:** [api-spec.md](docs/api/api-spec.md) | [openapi.yaml](docs/api/openapi.yaml)
- **Technology Stack Specifications:** [tech-stack.md](docs/architecture/tech-stack.md)
- **Architecture Decision Records (ADRs):** [docs/decisions/](docs/decisions/)
  - [ADR 001: Traditional 3-Tier Architecture](docs/decisions/001-adopt-traditional-3-tier-architecture.md)
  - [ADR 002: Application-Level Authorization](docs/decisions/002-enforce-authorization-in-application-layer.md)
  - [ADR 003: Clean Architecture for Backend](docs/decisions/003-adopt-clean-architecture.md)

---

## 2. Repository Structure

```
storify/
├── .agents/                 # Workspace agent skills & automation scripts
│   ├── adr-recorder/        # Skill for recording ADRs in docs/decisions/
│   └── system-overview-recorder/ # Skill for maintaining docs/architecture/system-overview.md
├── docs/
│   ├── api/                 # OpenAPI yaml specs and REST API design documentation
│   ├── architecture/        # System design, HLD diagrams, and tech stack specs
│   ├── database/            # Database schema, ERD, and indexing strategy specs
│   ├── decisions/           # Numbered ADR markdown files (00x-*.md)
│   ├── development/         # Implementation roadmap and developer guides
│   └── product/             # PRD and product specifications
├── storify-backend/         # Node.js + TypeScript (Express) Clean Architecture backend
└── storify-frontend/        # Next.js (React) web client
```

---

## 3. Strict Architectural Rules

All agents must strictly observe these design constraints:

1. **Direct-to-Cloud Byte Transfers:** Never route raw file upload or download streams through the Backend API. The API service only validates permissions and generates time-limited Pre-signed URLs for direct client-to-blob-storage transfer ([HLD](docs/architecture/high-level-design.md)).
2. **Clean Architecture in Backend:** Maintain strict inward dependency flow:
   - **Entities & Use Cases (Core):** Pure business logic. Must **never** import HTTP frameworks, ORMs, or database/cloud SDKs.
   - **Ports (Interfaces):** Use cases must depend exclusively on abstractions (`IFileRepository`, `IStorageProvider`, etc.).
   - **Adapters:** Concrete implementations (e.g. Postgres repository, S3 adapter, Express controllers) live in the adapter layer and implement the ports.
3. **Application-Level Authorization:** Do not rely on Database Row Level Security (RLS). The Backend API is the sole gatekeeper and must evaluate ownership and Materialized Path (`ltree`) downward-inheritance permissions in application Use Cases before returning metadata or issuing Pre-signed URLs ([ADR 002](docs/decisions/002-enforce-authorization-in-application-layer.md)).
4. **Strong Metadata Consistency:** Maintain ACID guarantees for all folder and file metadata operations in PostgreSQL.
5. **Asynchronous Heavy/Cleanup Tasks:** Large-scale folder purges and abandoned upload cleanups must be handled asynchronously or via background workers, not within blocking HTTP request lifecycles.

---

## 4. Testing & Verification Requirements

- **Unit Tests (Core & Use Cases):** Test domain logic and use cases in isolation with fast in-memory stubs/mocks without spinning up databases or network listeners.
- **Integration Tests (Adapters):** Test database repositories (PostgreSQL queries, `ltree` hierarchy operations) and storage adapters against test instances.
- **Contract & Route Tests:** Validate API endpoints, JWT authentication middleware, error mapping, and status codes (e.g. `403 Forbidden` on permission violations).

---

## 5. Decision & Documentation Workflows

- When a new architectural or technology decision is made, use the `adr-recorder` skill (`.agents/adr-recorder/`) to record it under `docs/decisions/`.
- When system-wide components, data flows, or infrastructure boundaries change, update `docs/architecture/system-overview.md` using the `system-overview-recorder` skill (`.agents/system-overview-recorder/`).
