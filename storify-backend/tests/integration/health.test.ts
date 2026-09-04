import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/infrastructure/http/app.js";
import { db } from "../../src/infrastructure/database/database-pool.js";

describe("GET /health Endpoint", () => {
  it("should return 200 OK and UP status when database is connected", async () => {
    vi.spyOn(db, "healthCheck").mockResolvedValueOnce(true);

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("status", "UP");
    expect(response.body).toHaveProperty("database", "CONNECTED");
    expect(response.body).toHaveProperty("timestamp");
    expect(response.body).toHaveProperty("poolStats");
  });

  it("should return 503 Service Unavailable and DEGRADED status when database check fails", async () => {
    vi.spyOn(db, "healthCheck").mockResolvedValueOnce(false);

    const response = await request(app).get("/health");

    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty("status", "DEGRADED");
    expect(response.body).toHaveProperty("database", "DISCONNECTED");
  });
});
