-- 005_create_permissions_table.up.sql
-- Permissions table: explicit access grants for users on specific folders or files

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id VARCHAR(26) REFERENCES folders(id) ON DELETE CASCADE,
    file_id VARCHAR(26) REFERENCES files(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_permissions_target CHECK (
        (folder_id IS NOT NULL AND file_id IS NULL) OR 
        (folder_id IS NULL AND file_id IS NOT NULL)
    ),
    CONSTRAINT uq_permissions_user_folder UNIQUE (user_id, folder_id),
    CONSTRAINT uq_permissions_user_file UNIQUE (user_id, file_id)
);

-- Indexes for shared items and collaborator lookups
CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_folder_id ON permissions (folder_id);
CREATE INDEX IF NOT EXISTS idx_permissions_file_id ON permissions (file_id);