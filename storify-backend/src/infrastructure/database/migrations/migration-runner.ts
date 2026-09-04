import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseConnectionPool, db as defaultDb } from "../database-pool.js";

export interface MigrationFile {
  name: string;
  upPath: string;
  downPath: string;
}

export interface MigrationStatus {
  name: string;
  applied: boolean;
  appliedAt?: Date;
}

export interface MigrationRunnerOptions {
  dbPool?: DatabaseConnectionPool;
  migrationsDir?: string;
}

export class MigrationRunner {
  private db: DatabaseConnectionPool;
  private migrationsDir: string;

  constructor(options?: MigrationRunnerOptions) {
    this.db = options?.dbPool || defaultDb;

    if (options?.migrationsDir) {
      this.migrationsDir = options.migrationsDir;
    } else {
      // Default to sql directory relative to this file
      const currentDir = path.dirname(fileURLToPath(import.meta.url));
      this.migrationsDir = path.join(currentDir, "sql");
    }
  }

  /**
   * Resolves the active migrations directory with fallback for compiled vs source mode.
   */
  private async resolveMigrationsDir(): Promise<string> {
    try {
      await fs.access(this.migrationsDir);
      return this.migrationsDir;
    } catch {
      // Fallback to project root src/ directory if running from dist
      const fallbackDir = path.resolve(
        process.cwd(),
        "src/infrastructure/database/migrations/sql"
      );
      try {
        await fs.access(fallbackDir);
        return fallbackDir;
      } catch {
        throw new Error(
          `Migrations directory not found at '${this.migrationsDir}' or '${fallbackDir}'`
        );
      }
    }
  }

  /**
   * Ensures the internal _migrations tracking table exists.
   */
  public async init(): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  /**
   * Retrieves all applied migration records from the database.
   */
  public async getAppliedMigrations(): Promise<{ name: string; applied_at: Date }[]> {
    await this.init();
    const result = await this.db.query<{ name: string; applied_at: Date }>(
      "SELECT name, applied_at FROM _migrations ORDER BY id ASC"
    );
    return result.rows;
  }

  /**
   * Reads and parses all available migration files on disk, sorted by name.
   */
  public async getAvailableMigrations(): Promise<MigrationFile[]> {
    const dir = await this.resolveMigrationsDir();
    const files = await fs.readdir(dir);

    const upFiles = files.filter((f) => f.endsWith(".up.sql"));
    const migrationMap = new Map<string, MigrationFile>();

    for (const upFile of upFiles) {
      const name = upFile.replace(/\.up\.sql$/, "");
      const downFile = `${name}.down.sql`;

      if (files.includes(downFile)) {
        migrationMap.set(name, {
          name,
          upPath: path.join(dir, upFile),
          downPath: path.join(dir, downFile),
        });
      } else {
        throw new Error(
          `Missing corresponding rollback file '${downFile}' for migration '${upFile}'`
        );
      }
    }

    return Array.from(migrationMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
    );
  }

  /**
   * Applies pending migrations in individual transactions.
   * @param steps Maximum number of migrations to apply (defaults to all pending).
   * @returns Array of migration names that were successfully applied.
   */
  public async up(steps?: number): Promise<string[]> {
    const available = await this.getAvailableMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedSet = new Set(applied.map((m) => m.name));

    const pending = available.filter((m) => !appliedSet.has(m.name));
    const toRun = steps !== undefined && steps > 0 ? pending.slice(0, steps) : pending;

    const executed: string[] = [];

    for (const migration of toRun) {
      const sql = await fs.readFile(migration.upPath, "utf-8");

      await this.db.transaction(async (client) => {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          migration.name,
        ]);
      });

      executed.push(migration.name);
    }

    return executed;
  }

  /**
   * Rolls back previously applied migrations in reverse order.
   * @param steps Number of migrations to rollback (default: 1).
   * @returns Array of migration names that were successfully rolled back.
   */
  public async down(steps = 1): Promise<string[]> {
    const available = await this.getAvailableMigrations();
    const applied = await this.getAppliedMigrations();

    if (applied.length === 0) {
      return [];
    }

    const availableMap = new Map(available.map((m) => [m.name, m]));
    const toRollback = applied.slice(-steps).reverse();
    const executed: string[] = [];

    for (const record of toRollback) {
      const migration = availableMap.get(record.name);
      if (!migration) {
        throw new Error(
          `Cannot rollback migration '${record.name}': definition file not found on disk.`
        );
      }

      const sql = await fs.readFile(migration.downPath, "utf-8");

      await this.db.transaction(async (client) => {
        await client.query(sql);
        await client.query("DELETE FROM _migrations WHERE name = $1", [
          record.name,
        ]);
      });

      executed.push(record.name);
    }

    return executed;
  }

  /**
   * Returns status for all migrations (applied or pending).
   */
  public async status(): Promise<MigrationStatus[]> {
    const available = await this.getAvailableMigrations();
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map((m) => [m.name, m.applied_at]));

    return available.map((m) => {
      const appliedAt = appliedMap.get(m.name);
      return {
        name: m.name,
        applied: appliedAt !== undefined,
        appliedAt,
      };
    });
  }
}
