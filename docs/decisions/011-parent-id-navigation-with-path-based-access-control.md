# 011. Parent-ID driven navigation with path-based access control

## Status

Accepted

## Context

In collaborative cloud storage platforms, items can be created by different users within shared folder hierarchies. For example, User B (an Editor on User A's folder `ProjectX`) creates a subfolder `Designs`. 
- `Designs` is owned by User B (`owner_id = user_b`), but physically resides inside User A's folder hierarchy (`path = rootA.sub1.ProjectX.Designs`).

If navigation or list queries filter solely by `owner_id = current_user`, shared subfolders would incorrectly appear in the creator's personal root view rather than inside the shared folder.

## Decision

We will decouple folder navigation from ownership filtering and enforce **Parent-ID driven listing with path-based access control**:
1. **Personal Drive ("My Drive"):** Lists immediate child folders and files where `parent_id = user_root_folder_id`.
2. **Shared with Me:** Lists top-level shared entry points by querying the `permissions` table directly for the current user.
3. **Folder Navigation (`GET /folders/:id`):** Fetches immediate children using `parent_id = $folderId` (and `folder_id = $folderId` for files). Authorization is validated by testing whether the user has ownership or explicit permission on any ancestor node along the target folder's `ltree` path (`ancestor.path @> target.path`).

## Consequences

- Folders and files always render in their true hierarchical location, regardless of which collaborator created them.
- Clear separation between personal root items, shared entry points, and nested subfolder contents.
- Direct lookup by `parent_id` is fast and simple ($O(1)$ index lookup) while security is verified against the indexed `ltree` path.
