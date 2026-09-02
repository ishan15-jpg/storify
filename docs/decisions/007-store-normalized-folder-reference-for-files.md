# 007. Store normalized folder reference for files instead of denormalized ltree paths

## Status

Accepted

## Context

The Storify platform models folder hierarchies using PostgreSQL's `ltree` extension. We needed to decide how files relate to the folder hierarchy:
1. **Denormalized `path` on `files` table:** Each file row stores its full materialized path (e.g. `root.folderA.folderB.fileId`).
2. **Normalized `folder_id` on `files` table:** Files store only a foreign key referencing `folders.id`, while folder rows hold the materialized `ltree` path.

Under a denormalized model, checking file permissions is a single-table lookup, but moving a folder with thousands of files requires updating the `path` column on every descendant file row, creating extensive row locks and violating the `< 200ms` metadata latency SLA. Under a normalized model, moving a folder requires updating only the `folders` table in a single prefix-replace query (`$new_parent_path || subpath(path, nlevel($old_parent_path))`), while files automatically reflect the new location without row updates.

## Decision

We will store only a normalized `folder_id` foreign key on the `files` table and maintain materialized `ltree` paths exclusively on the `folders` table.

This ensures folder move operations remain $O(\text{subfolders})$ rather than $O(\text{files})$, eliminating write amplification and data inconsistency risks between files and parent folders.

## Consequences

- Folder move operations execute in milliseconds with zero row locks or updates on the `files` table.
- Eliminates any possibility of a file's materialized path drifting out of sync with its parent folder's path.
- Permission evaluation for files requires a fast indexed join/lookup against the `folders` table to inspect the parent folder's `ltree` ancestry.
