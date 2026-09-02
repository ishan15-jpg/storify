import { describe, it, expect, vi } from "vitest";
import { DatabaseConnectionPool } from "../../src/infrastructure/database/database-pool.js";

describe("DatabaseConnectionPool", () => {
  it("should initialize database connection pool with valid configuration", () => {
    const customPool = new DatabaseConnectionPool({
      host: "localhost",
      port: 5432,
      database: "testdb",
      user: "postgres",
      password: "password",
      max: 5,
    });

    const stats = customPool.getStats();
    expect(stats).toHaveProperty("totalCount");
    expect(stats).toHaveProperty("idleCount");
    expect(stats).toHaveProperty("waitingCount");
  });

  it("should handle transactions and execute commit on success", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText === "BEGIN" || queryText === "COMMIT" || queryText === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
      }),
      release: vi.fn(),
    };

    const pool = new DatabaseConnectionPool();
    vi.spyOn(pool, "getClient").mockResolvedValue(mockClient as any);

    const result = await pool.transaction(async (client) => {
      const res = await client.query("INSERT INTO test VALUES ($1)", [1]);
      return res.rows[0];
    });

    expect(result).toEqual({ id: 1 });
    expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
    expect(mockClient.query).not.toHaveBeenCalledWith("ROLLBACK");
    expect(mockClient.release).toHaveBeenCalled();
  });

  it("should execute rollback and release client when transaction throws an error", async () => {
    const mockClient = {
      query: vi.fn().mockImplementation((queryText: string) => {
        if (queryText === "BEGIN" || queryText === "COMMIT" || queryText === "ROLLBACK") {
          return Promise.resolve({ rows: [], rowCount: 0 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      }),
      release: vi.fn(),
    };

    const pool = new DatabaseConnectionPool();
    vi.spyOn(pool, "getClient").mockResolvedValue(mockClient as any);

    await expect(
      pool.transaction(async () => {
        throw new Error("Simulated database failure");
      })
    ).rejects.toThrowError("Simulated database failure");

    expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
    expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
    expect(mockClient.query).not.toHaveBeenCalledWith("COMMIT");
    expect(mockClient.release).toHaveBeenCalled();
  });
});
