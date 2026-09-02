import { app } from "./infrastructure/http/app.js";
import { config } from "./infrastructure/config/env.config.js";
import { db } from "./infrastructure/database/database-pool.js";

const server = app.listen(config.PORT, () => {
  console.log(`Storify Backend API listening on http://localhost:${config.PORT} [${config.NODE_ENV}]`);
});

// Graceful shutdown handling
async function shutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);

  server.close(async () => {
    console.log("HTTP server closed.");
    try {
      await db.close();
      console.log("Database connection pool closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error closing database pool:", err);
      process.exit(1);
    }
  });

  // Force close after 10s timeout
  setTimeout(() => {
    console.error("Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
