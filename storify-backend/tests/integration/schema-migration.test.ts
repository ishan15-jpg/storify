import { describe, it, expect } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(__dirname, "../../src/infrastructure/database/migrations/sql");

describe("Database Schema SQL Migrations", () => {
  it("should contain all 7 migration up/down pairs", async () => {
    const files = await fs.readdir(sqlDir);
    const expectedMigrations = [
      "001_enable_ltree",
      "002_create_users_table",
      "003_create_folders_table",
      "004_create_files_table",
      "005_create_permissions_table",
      "006_create_public_links_table",
      "007_create_starred_items_table",
    ];

    for (const name of expectedMigrations) {
      expect(files).toContain(`${name}.up.sql`);
      expect(files).toContain(`${name}.down.sql`);
    }
  });

  it("001_enable_ltree should manage the ltree extension", async () => {
    const upSql = await fs.readFile(path.join(sqlDir, "001_enable_ltree.up.sql"), "utf-8");
    const downSql = await fs.readFile(path.join(sqlDir, "001_enable_ltree.down.sql"), "utf-8");

    expect(upSql).toMatch(/CREATE\s+EXTENSION\s+IF\s+NOT\s+EXISTS\s+ltree/i);
    expect(downSql).toMatch(/DROP\s+EXTENSION\s+IF\s+EXISTS\s+ltree/i);
  });

  it("002_create_users_table should define users table with ULID PK and OAuth uniqueness", async () => {
    const upSql = await fs.readFile(path.join(sqlDir, "002_create_users_table.up.sql"), "utf-8");
    const downSql = await fs.readFile(path.join(sqlDir, "002_create_users_table.down.sql"), "utf-8");

    expect(upSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+users/i);
    expect(upSql).toContain("id VARCHAR(26) PRIMARY KEY");
    expect(upSql).toContain("email VARCHAR(255) NOT NULL");
    expect(upSql).toContain("uq_users_email");
    expect(upSql).toContain("uq_users_oauth");
    expect(downSql).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+users/i);
  });

  it("003_create_folders_table should define folders table with ltree path and GiST index", async () => {
    const upSql = await fs.readFile(path.join(sqlDir, "003_create_folders_table.up.sql"), "utf-8");
    const downSql = await fs.readFile(path.join(sqlDir, "003_create_folders_table.down.sql"), "utf-8");

    expect(upSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+folders/i);
    expect(upSql).toContain("id VARCHAR(26) PRIMARY KEY");
    expect(upSql).toContain("path LTREE NOT NULL");
    expect(upSql).toContain("parent_id VARCHAR(26) REFERENCES folders(id) ON DELETE CASCADE");
    expect(upSql).toContain("owner_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE");
    expect(upSql).toContain("is_trashed BOOLEAN NOT NULL DEFAULT FALSE");
    expect(upSql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_folders_path_gist\s+ON\s+folders\s+USING\s+GIST\s+\(path\)/i);
    expect(upSql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_folders_parent_id\s+ON\s+folders\s+\(parent_id\)/i);
    expect(upSql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_folders_owner_id\s+ON\s+folders\s+\(owner_id\)/i);
    expect(upSql).toMatch(/CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+uq_folders_active_name\s+ON\s+folders\s+\(parent_id,\s*name\)\s+WHERE\s+is_trashed\s*=\s*false/i);
    expect(downSql).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+folders/i);
  });

  it("004_create_files_table should define files table with 1GB constraint and cleanup index", async () => {
    const upSql = await fs.readFile(path.join(sqlDir, "004_create_files_table.up.sql"), "utf-8");
    const downSql = await fs.readFile(path.join(sqlDir, "004_create_files_table.down.sql"), "utf-8");

    expect(upSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+files/i);
    expect(upSql).toContain("id VARCHAR(26) PRIMARY KEY");
    expect(upSql).toContain("folder_id VARCHAR(26) NOT NULL REFERENCES folders(id) ON DELETE CASCADE");
    expect(upSql).toContain("owner_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE");
    expect(upSql).toContain("size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0 AND size_bytes <= 1073741824)");
    expect(upSql).toContain("status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'COMPLETED'))");
    expect(upSql).toContain("is_trashed BOOLEAN NOT NULL DEFAULT FALSE");
    expect(upSql).toMatch(/CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_files_pending_cleanup\s+ON\s+files\s+\(created_at\)\s+WHERE\s+status\s*=\s*'PENDING'/i);
    expect(upSql).toMatch(/CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+uq_files_active_name\s+ON\s+files\s+\(folder_id,\s*name\)\s+WHERE\s+is_trashed\s*=\s*false/i);
    expect(downSql).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+files/i);
  });

  it("005_create_permissions_table should define permissions with mutual exclusivity constraint", async () => {
    const upSql = await fs.readFile(path.join(sqlDir, "005_create_permissions_table.up.sql"), "utf-8");
    const downSql = await fs.readFile(path.join(sqlDir, "005_create_permissions_table.down.sql"), "utf-8");

    expect(upSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+permissions/i);
    expect(upSql).toContain("role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER'))");
    expect(upSql).toContain("chk_permissions_target");
    expect(upSql).toContain("uq_permissions_user_folder");
    expect(upSql).toContain("uq_permissions_user_file");
    expect(downSql).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+permissions/i);
  });

  it("006_create_public_links_table should define public links with target constraint", async () => {
    const upSql = await fs.readFile(path.join(sqlDir, "006_create_public_links_table.up.sql"), "utf-8");
    const downSql = await fs.readFile(path.join(sqlDir, "006_create_public_links_table.down.sql"), "utf-8");

    expect(upSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+public_links/i);
    expect(upSql).toContain("created_by VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE");
    expect(upSql).toContain("password_hash VARCHAR(255)");
    expect(upSql).toContain("expires_at TIMESTAMPTZ");
    expect(upSql).toContain("chk_public_links_target");
    expect(downSql).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+public_links/i);
  });

  it("007_create_starred_items_table should define starred items with target and user uniqueness", async () => {
    const upSql = await fs.readFile(path.join(sqlDir, "007_create_starred_items_table.up.sql"), "utf-8");
    const downSql = await fs.readFile(path.join(sqlDir, "007_create_starred_items_table.down.sql"), "utf-8");

    expect(upSql).toMatch(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+starred_items/i);
    expect(upSql).toContain("user_id VARCHAR(26) NOT NULL REFERENCES users(id) ON DELETE CASCADE");
    expect(upSql).toContain("chk_starred_target");
    expect(upSql).toContain("uq_starred_user_folder");
    expect(upSql).toContain("uq_starred_user_file");
    expect(downSql).toMatch(/DROP\s+TABLE\s+IF\s+EXISTS\s+starred_items/i);
  });
});
