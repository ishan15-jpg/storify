# 003. Adopt Clean Architecture for the backend

## Status

Accepted

## Context

Having selected a traditional 3-tier architecture with a custom backend API (ADR 001), we needed to determine the internal architectural style of the backend codebase. We explicitly excluded the traditional Layered Monolith to prevent long-term coupling and "spaghetti code." We evaluated the Modular Monolith (domain-driven boundaries with pragmatic MCRS internals) and Clean Architecture / Hexagonal Architecture (strict dependency inversion with core business logic isolated from infrastructure). 

While the Modular Monolith is typically recommended for MVPs due to lower boilerplate, the PRD defines this project context as a "personal/learning project built with practical, production-oriented considerations." A primary goal for the developer is to master Low-Level Design (LLD) principles, specifically SOLID and Dependency Inversion.

## Decision

We will adopt **Clean Architecture (Hexagonal / Ports and Adapters)** for the internal structure of the backend API. The application will be structured in concentric layers (Entities -> Use Cases -> Interface Adapters -> Frameworks & Drivers), ensuring that the core business domain and use cases depend solely on interfaces (Ports) rather than concrete infrastructure like databases or HTTP frameworks.

## Consequences

- **Ultimate Testability:** Business rules (e.g., Materialized Path inheritance checks) can be tested entirely in isolation with near-instant execution times, without relying on mock databases or web servers.
- **Technology Agnosticism:** External dependencies (like AWS S3 for storage or PostgreSQL for metadata) are treated as swappable plugins via Adapters.
- **High Boilerplate Overhead:** Development velocity for simple CRUD operations will be slower due to the necessity of mapping data across layers (DB Models -> Entities -> DTOs) and defining explicit Interfaces/Ports.
- **Steep Learning Curve:** Imposes strict discipline on dependency flow, but deeply fulfills the project's secondary goal of mastering advanced LLD patterns.
