# Product Requirements Document (PRD) - Storify (MVP)

## 1. Project Overview & Target Audience
* **Project Concept:** Cloud-based storage SaaS (similar to Google Drive) for storing, organizing, and sharing files.
* **Target Audience:** Individuals, students, and small teams.
* **Context:** Personal/learning project built with practical, production-oriented considerations for an initial Minimum Viable Product (MVP).

---

## 2. Confirmed Functional Requirements

### 2.1 Files & Folders
* **Maximum File Size:** 1GB per file.
* **Upload Strategy:** Multipart / chunked uploads to reliably handle files up to 1GB. Direct-to-cloud uploads via Supabase.
* **Folder Structure:** Support for infinitely nested folder structures.
* **Hierarchy Modeling:** Materialized Path (Path Enumeration) pattern to represent ancestry and resolve hierarchy efficiently.

### 2.2 Access Control, Roles & Permissions
* **User Roles & Specific Permissions:**
  * **Owner:** Full access. Has the ability to transfer ownership of a file or folder to another user.
  * **Editor:** Can update/modify file contents and metadata. Cannot delete files originally uploaded by the owner (can only delete files they uploaded themselves). Can share the folder with new users and generate public links.
  * **Viewer:** Read and download access only.
  * **Public User:** Access via shared link (read/download only via unique link).
* **Inheritance:** Permissions are strictly inherited down the folder tree from parent to child.
* **Public Share Links:** Ability to generate public links for files/folders with optional expiration dates and optional password protection.

### 2.3 File Management & Organization
* **Search Filters:** Users can search and filter files/folders based on metadata (name, type, size, dates).
* **Favorites:** Users can "star" or favorite files and folders for quick access.
* **Trash & Restore:** Soft-delete functionality. Deleted items are moved to a Trash view where they can be restored or permanently deleted.

---

## 3. Non-Functional Requirements (NFRs)

### 3.1 Durability & Data Loss
* Zero data loss for uploaded files; file storage durability delegated to Supabase Storage.

### 3.2 Consistency vs. Availability
* **Metadata Consistency:** Strong consistency (ACID) for metadata operations (creating, moving, deleting, sharing files/folders) enforced by PostgreSQL.
* **Availability:** Moderate availability acceptable for MVP.

### 3.3 Performance & Latency
* **Metadata Operations:** Fast response times (< 200ms) for folder listing and permission checks, heavily leveraging PostgreSQL indices and Row Level Security (RLS).
* **File Transfers:** Optimized by allowing clients to upload directly to Supabase Storage, bypassing custom backend bottlenecks.

### 3.4 Security & Authentication
* **Data in Transit / At Rest:** HTTPS/TLS in transit, encrypted at rest.
* **Authentication:** Supabase Auth handling OAuth (e.g., Google, GitHub) and JWT issuance.
* **Authorization:** Supabase PostgreSQL Row Level Security (RLS) policies guaranteeing secure access to both database rows and storage objects.

---

## 4. Constraints

* **Inheritance Model:** Strict downward inheritance with **no lower-level permission overrides** (if a user has access to a parent folder, they implicitly have that access to all children).
* **Maximum File Size Limit:** Hard cap of 1GB per uploaded item.

---

## 5. Non-Goals (Out of Scope for MVP)

* **File Versioning:** No history or multiple versions per file.
* **Previews & Thumbnails:** No server-side generation of previews, thumbnails, or transcoded media.
* **Audit Logging:** Tracking exactly who viewed or downloaded files and when.
* **Granular Overrides:** No capability to revoke or override inherited permissions at deeper sub-folder or file levels.

---

## 6. Architecture & Tech Stack Decisions

* **Unified Backend-as-a-Service:** Supabase (PostgreSQL, GoTrue Auth, Supabase Storage).
* **Development Flow:** Local-first development using Supabase CLI (Docker), ensuring seamless migration to cloud deployment.
* **Capacity Planning Estimates:**
  * ~10,000 active users
  * ~500 files per user on average (~10MB average file size)
  * ~5,000,000 metadata records
  * ~50TB total raw storage capacity
