-- 006_create_public_links_table.up.sql
-- Public links table: manages tokenized public share links with optional password protection and TTL expiration

CREATE TABLE IF NOT EXISTS public_links (
    id VARCHAR(26) PRIMARY KEY,
    folder_id VARCHAR(26) REFERENCES folders(id) ON DELETE CASCADE,
    file_id VARCHAR(26) REFERENCES files(id) ON DELETE CASCADE,
    created_by VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(255),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_public_links_target CHECK (
        (folder_id IS NOT NULL AND file_id IS NULL) OR 
        (folder_id IS NULL AND file_id IS NOT NULL)
    )
);

-- Indexes for target resource resolution
CREATE INDEX IF NOT EXISTS idx_public_links_folder_id ON public_links (folder_id);
CREATE INDEX IF NOT EXISTS idx_public_links_file_id ON public_links (file_id);