import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MigrationRunner } from "../../src/infrastructure/database/migrations/migration-runner.js";
import { DatabaseConnectionPool } from "../../src/infrastructure/database/database-pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.resolve(__dirname, "../../src/infrastructure/database/migrations/sql");

describe("MigrationRunner", () => {
  let mockDb: DatabaseConnectionPool;
  let queryMock: ReturnType<typeof vi.fn>;
  let transactionMock: ReturnType<typeof vi.fn>;
  let appliedRecords: { name: string; applied_at: Date }[];

  beforeEach(() => {
    appliedRecords = [];
    queryMock = vi.fn().mockImplementation((queryText: string) => {
      if (queryText.includes("CREATE TABLE IF NOT EXISTS _migrations")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (queryText.includes("SELECT name, applied_at FROM _migrations")) {
        return Promise.resolve({ rows: [...appliedRecords], rowCount: appliedRecords.length });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    transactionMock = vi.fn().mockImplementation(async (cb) => {
      const clientMock = {
        query: vi.fn().mockImplementation((queryText: string, params?: any[]) => {
          if (queryText.includes("INSERT INTO _migrations")) {
            appliedRecords.push({ name: params?.[0], applied_at: new Date() });
          } else if (queryText.includes("DELETE FROM _migrations")) {
            appliedRecords = appliedRecords.filter((r) => r.name !== params?.[0]);
          }
          return Promise.resolve({ rows: [], rowCount: 1 });
        }),
      };
      return cb(clientMock);
    });

    mockDb = {
      query: queryMock,
      transaction: transactionMock,
    } as unknown as DatabaseConnectionPool;
  });

  it("should discover and sort all available migration files in correct order", async () => {
    const runner = new MigrationRunner({
      dbPool: mockDb,
      migrationsDir: sqlDir,
    });

    const migrations = await runner.getAvailableMigrations();
    expect(migrations).toHaveLength(7);

    const names = migrations.map((m) => m.name);
    expect(names).toEqual([
      "001_enable_ltree",
      "002_create_users_table",
      "003_create_folders_table",
      "004_create_files_table",
      "005_create_permissions_table",
      "006_create_public_links_table",
      "007_create_starred_items_table",
    ]);

    migrations.forEach((m) => {
      expect(m.upPath).toContain(`${m.name}.up.sql`);
      expect(m.downPath).toContain(`${m.name}.down.sql`);
    });
  });

  it("should initialize _migrations table on init()", async () => {
    const runner = new MigrationRunner({
      dbPool: mockDb,
      migrationsDir: sqlDir,
    });

    await runner.init();
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(queryMock.mock.calls[0][0]).toContain("CREATE TABLE IF NOT EXISTS _migrations");
  });

  it("should return correct status when some migrations are applied and others pending", async () => {
    const appliedDate = new Date("2026-09-01T12:00:00Z");
    appliedRecords = [
      { name: "001_enable_ltree", applied_at: appliedDate },
      { name: "002_create_users_table", applied_at: appliedDate },
    ];

    const runner = new MigrationRunner({
      dbPool: mockDb,
      migrationsDir: sqlDir,
    });

    const statuses = await runner.status();
    expect(statuses).toHaveLength(7);
    expect(statuses[0]).toEqual({
      name: "001_enable_ltree",
      applied: true,
      appliedAt: appliedDate,
    });
    expect(statuses[1]).toEqual({
      name: "002_create_users_table",
      applied: true,
      appliedAt: appliedDate,
    });
    expect(statuses[2]).toEqual({
      name: "003_create_folders_table",
      applied: false,
      appliedAt: undefined,
    });
  });

  it("should apply pending migrations within transactions on up()", async () => {
    const runner = new MigrationRunner({
      dbPool: mockDb,
      migrationsDir: sqlDir,
    });

    const applied = await runner.up();
    expect(applied).toHaveLength(7);
    expect(applied).toEqual([
      "001_enable_ltree",
      "002_create_users_table",
      "003_create_folders_table",
      "004_create_files_table",
      "005_create_permissions_table",
      "006_create_public_links_table",
      "007_create_starred_items_table",
    ]);
    expect(transactionMock).toHaveBeenCalledTimes(7);
    expect(appliedRecords).toHaveLength(7);
  });

  it("should apply only specified number of pending migrations when steps argument is given", async () => {
    const runner = new MigrationRunner({
      dbPool: mockDb,
      migrationsDir: sqlDir,
    });

    const applied = await runner.up(2);
    expect(applied).toHaveLength(2);
    expect(applied).toEqual(["001_enable_ltree", "002_create_users_table"]);
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(appliedRecords).toHaveLength(2);
  });

  it("should rollback applied migrations in reverse order on down()", async () => {
    appliedRecords = [
      { name: "001_enable_ltree", applied_at: new Date() },
      { name: "002_create_users_table", applied_at: new Date() },
      { name: "003_create_folders_table", applied_at: new Date() },
    ];

    const runner = new MigrationRunner({
      dbPool: mockDb,
      migrationsDir: sqlDir,
    });

    const rolledBack = await runner.down(2);
    expect(rolledBack).toHaveLength(2);
    expect(rolledBack).toEqual([
      "003_create_folders_table",
      "002_create_users_table",
    ]);
    expect(transactionMock).toHaveBeenCalledTimes(2);
    expect(appliedRecords).toHaveLength(1);
    expect(appliedRecords[0].name).toBe("001_enable_ltree");
  });

  it("should return empty array if down() is called with no applied migrations", async () => {
    const runner = new MigrationRunner({
      dbPool: mockDb,
      migrationsDir: sqlDir,
    });

    const rolledBack = await runner.down(1);
    expect(rolledBack).toEqual([]);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("should propagate transaction failures during up()", async () => {
    transactionMock.mockRejectedValueOnce(new Error("Simulated SQL syntax error"));

    const runner = new MigrationRunner({
      dbPool: mockDb,
      migrationsDir: sqlDir,
    });

    await expect(runner.up()).rejects.toThrow("Simulated SQL syntax error");
  });
});
