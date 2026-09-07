#!/usr/bin/env node
import { db } from "../database-pool.js";
import { MigrationRunner } from "./migration-runner.js";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "up";
  const stepsArg = args[1] ? parseInt(args[1], 10) : undefined;

  const runner = new MigrationRunner();

  try {
    switch (command) {
      case "up": {
        console.log(`[Migrations] Executing migration UP${stepsArg ? ` (max ${stepsArg} steps)` : ""}...`);
        const applied = await runner.up(stepsArg);
        if (applied.length === 0) {
          console.log("[Migrations] Database is already up to date. No pending migrations.");
        } else {
          console.log(`[Migrations] Successfully applied ${applied.length} migration(s):`);
          applied.forEach((name) => console.log(`  ✓ ${name}`));
        }
        break;
      }
      case "down": {
        const steps = stepsArg !== undefined && !isNaN(stepsArg) ? stepsArg : 1;
        console.log(`[Migrations] Executing migration DOWN (${steps} step(s))...`);
        const rolledBack = await runner.down(steps);
        if (rolledBack.length === 0) {
          console.log("[Migrations] No applied migrations to rollback.");
        } else {
          console.log(`[Migrations] Successfully rolled back ${rolledBack.length} migration(s):`);
          rolledBack.forEach((name) => console.log(`  ↺ ${name}`));
        }
        break;
      }
      case "status": {
        console.log("[Migrations] Current Migration Status:");
        const statuses = await runner.status();
        if (statuses.length === 0) {
          console.log("  No migration files found.");
        } else {
          statuses.forEach((s) => {
            const badge = s.applied ? "✓ APPLIED" : "○ PENDING";
            const dateStr = s.appliedAt ? ` (at ${s.appliedAt.toISOString()})` : "";
            console.log(`  ${badge.padEnd(11)} ${s.name}${dateStr}`);
          });
        }
        break;
      }
      default: {
        console.error(`Unknown command: '${command}'. Valid commands are: 'up', 'down', 'status'.`);
        process.exitCode = 1;
      }
    }
  } catch (err) {
    console.error("[Migrations] Error executing migration command:", err);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();
