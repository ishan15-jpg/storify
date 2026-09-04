-- 007_create_starred_items_table.up.sql
-- Starred items table: stores user-specific bookmarks for quick dashboard access

CREATE TABLE IF NOT EXISTS starred_items (
    id VARCHAR(26) PRIMARY KEY,
    user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_id VARCHAR(26) REFERENCES folders(id) ON DELETE CASCADE,
    file_id VARCHAR(26) REFERENCES files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_starred_target CHECK (
        (folder_id IS NOT NULL AND file_id IS NULL) OR 
        (folder_id IS NULL AND file_id IS NOT NULL)
    ),
    CONSTRAINT uq_starred_user_folder UNIQUE (user_id, folder_id),
    CONSTRAINT uq_starred_user_file UNIQUE (user_id, file_id)
);

-- Index for retrieving user bookmarks
CREATE INDEX IF NOT EXISTS idx_starred_user_id ON starred_items (user_id);