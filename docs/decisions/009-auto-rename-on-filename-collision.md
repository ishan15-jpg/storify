# 009. Auto-rename on filename collision

## Status

Accepted

## Context

When users upload a file into a folder where another active file with the identical name already exists, the system must handle the naming conflict. We evaluated three strategies:
1. **Reject with 409 Conflict:** Return an HTTP 409 error requiring the user to manually rename the file before uploading.
2. **Overwrite Existing File:** Overwrite the metadata and blob storage content of the previous file.
3. **Auto-Rename with Numerical Suffix:** Automatically generate a unique filename by appending a numerical counter (e.g. `document (1).pdf`, `document (2).pdf`), similar to Google Drive and modern operating systems.

Given that file versioning is out of scope for the MVP, silent overwrites risk unintentional data loss. Rejecting with a 409 creates friction in multi-file upload workflows.

## Decision

We will adopt an **auto-rename strategy** for duplicate filenames. 

When a file upload is initiated with a name that already exists within the target folder, the Backend API will detect the collision and automatically append an incremented suffix (e.g. `filename (1).ext`) to the metadata record before issuing the Pre-signed URL.

## Consequences

- Smooth user experience during multi-file drag-and-drop uploads without disruption or manual rename steps.
- Eliminates the risk of accidental file overwrites in shared collaboration folders.
- Requires an efficient database index check on `(folder_id, name)` to determine the next available suffix during upload initiation.
