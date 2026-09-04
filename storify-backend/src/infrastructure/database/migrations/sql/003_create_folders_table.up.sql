-- 003_create_folders_table.up.sql
-- Folders table: maintains folder hierarchy using parent_id and ltree materialized path

CREATE TABLE IF NOT EXISTS folders (
    id VARCHAR(26) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    path LTREE NOT NULL,
    parent_id VARCHAR(26) REFERENCES folders(id) ON DELETE CASCADE,
    owner_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
    trashed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for hierarchy traversal, access control, and quick navigation
CREATE INDEX IF NOT EXISTS idx_folders_path_gist ON folders USING GIST (path);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_owner_id ON folders (owner_id);

-- Enforce unique folder names among active siblings in the same directory (ADR 009, ADR 010)
CREATE UNIQUE INDEX IF NOT EXISTS uq_folders_active_name ON folders (parent_id, name) WHERE is_trashed = false;