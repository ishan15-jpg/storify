import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from "pg";
import { config } from "../config/env.config.js";

export class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private pool: Pool;
  private isClosed = false;

  constructor(customConfig?: PoolConfig) {
    const poolConfig: PoolConfig = customConfig || {
      connectionString: config.DATABASE_URL,
      host: config.DB_HOST,
      port: config.DB_PORT,
      user: config.DB_USER,
      password: config.DB_PASSWORD,
      database: config.DB_NAME,
      max: config.DB_POOL_MAX,
      idleTimeoutMillis: config.DB_POOL_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: config.DB_POOL_CONNECTION_TIMEOUT_MS,
    };

    this.pool = new Pool(poolConfig);

    this.pool.on("error", (err: Error) => {
      console.error("Unexpected error on idle PostgreSQL client", err);
    });
  }

  public static getInstance(customConfig?: PoolConfig): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance = new DatabaseConnectionPool(customConfig);
    }
    return DatabaseConnectionPool.instance;
  }

  /**
   * Executes a parameterized query using a client from the pool.
   */
  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (this.isClosed) {
      throw new Error("Cannot execute query on closed database pool.");
    }
    return this.pool.query<T>(text, params);
  }

  /**
   * Acquires a client from the pool. Caller must release client after use.
   */
  public async getClient(): Promise<PoolClient> {
    if (this.isClosed) {
      throw new Error("Cannot checkout client from closed database pool.");
    }
    return this.pool.connect();
  }

  /**
   * Executes an operation inside an ACID database transaction.
   * Automatically executes BEGIN, COMMIT, and ROLLBACK on error.
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Error during transaction rollback:", rollbackError);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Performs a lightweight ping to verify database connectivity.
   */
  public async healthCheck(): Promise<boolean> {
    if (this.isClosed) {
      return false;
    }
    try {
      const result = await this.pool.query("SELECT 1 as ping");
      return result.rows.length > 0 && result.rows[0].ping === 1;
    } catch (error) {
      return false;
    }
  }

  /**
   * Gracefully shuts down the connection pool.
   */
  public async close(): Promise<void> {
    if (!this.isClosed) {
      this.isClosed = true;
      await this.pool.end();
    }
  }

  /**
   * Returns pool statistics for telemetry and monitoring.
   */
  public getStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

export const db = DatabaseConnectionPool.getInstance();
