# 010. Target-only soft-delete with ancestor trash resolution

## Status

Accepted

## Context

When a user deletes a folder or file, it moves to Trash (soft-delete). We considered two implementation models for cascading soft-deletes across deep folder trees:
1. **Recursive Subtree Updates:** Executing an `UPDATE` across all descendant folders and files (`UPDATE folders SET is_trashed = true WHERE path <@ $path`).
2. **Target-Only Soft-Delete with Dynamic Ancestor Resolution:** Setting `is_trashed = true` only on the explicitly deleted folder or file, and determining visibility at query time based on whether any ancestor in the `ltree` path is trashed.

Additionally, we needed to establish restoration rules when restoring items from Trash.

## Decision

We will implement **target-only soft-delete** and enforce parent-dependent restoration:
1. Deleting an item sets `is_trashed = true` and `trashed_at = NOW()` strictly on the target record without cascading updates to descendant rows.
2. Active folder and file listing queries filter items whose immediate parent or ancestors are trashed.
3. In the Trash view, only explicitly deleted top-level nodes are displayed and restorable. Individual files and subfolders nested inside a trashed parent folder cannot be restored independently; the parent trashed folder must be restored first.

## Consequences

- Soft-deleting a large folder tree executes instantaneously ($O(1)$) with zero write locks across descendant rows.
- Prevents orphaned subfolder restoration states where a restored child item points to a still-trashed parent directory.
- Requires queries to evaluate ancestor trash state when fetching hierarchical views.
