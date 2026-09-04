-- 004_create_files_table.up.sql
-- Files table: stores file metadata, object storage references, and upload lifecycle states

CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(26) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    folder_id VARCHAR(26) NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    owner_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 1073741824),
    mime_type VARCHAR(255) NOT NULL,
    s3_key VARCHAR(1024) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED')),
    is_trashed BOOLEAN NOT NULL DEFAULT FALSE,
    trashed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for folder listing, ownership/quota, and background cleanup
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files (folder_id);
CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files (owner_id);
CREATE INDEX IF NOT EXISTS idx_files_pending_cleanup ON files (created_at) WHERE status = 'PENDING';

-- Enforce unique filenames among active files in the same directory (ADR 009, ADR 010)
CREATE UNIQUE INDEX IF NOT EXISTS uq_files_active_name ON files (folder_id, name) WHERE is_trashed = false;