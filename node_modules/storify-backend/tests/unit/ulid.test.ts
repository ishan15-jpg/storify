import { describe, it, expect } from "vitest";
import { generateUlid, isValidUlid, getUlidTimestamp, ULID_REGEX } from "../../src/core/utils/ulid.js";

describe("ULID Utility", () => {
  it("should generate a valid 26-character Crockford Base32 ULID", () => {
    const id = generateUlid();
    expect(id).toBeDefined();
    expect(id).toHaveLength(26);
    expect(ULID_REGEX.test(id)).toBe(true);
    expect(isValidUlid(id)).toBe(true);
  });

  it("should reject invalid identifiers", () => {
    expect(isValidUlid("")).toBe(false);
    expect(isValidUlid("short-id")).toBe(false);
    expect(isValidUlid("12345678-1234-1234-1234-123456789012")).toBe(false); // UUID with hyphens
    expect(isValidUlid("01ARZ3NDEKTSV4RRFFQ69G5FA!")).toBe(false); // Special character
    expect(isValidUlid("01ARZ3NDEKTSV4RRFFQ69G5FAI")).toBe(false); // Contains 'I' (not in Crockford Base32)
    expect(isValidUlid(null)).toBe(false);
    expect(isValidUlid(undefined)).toBe(false);
    expect(isValidUlid(12345)).toBe(false);
  });

  it("should generate lexicographically sortable identifiers over time", async () => {
    const id1 = generateUlid(Date.now() - 1000);
    const id2 = generateUlid(Date.now());

    expect(id1 < id2).toBe(true);
  });

  it("should correctly extract timestamp from a valid ULID", () => {
    const now = Date.now();
    const id = generateUlid(now);
    const extractedTimestamp = getUlidTimestamp(id);

    // Timestamp precision within 1ms
    expect(extractedTimestamp).toBe(now);
  });

  it("should throw when extracting timestamp from invalid ULID", () => {
    expect(() => getUlidTimestamp("invalid-ulid")).toThrowError(/Cannot extract timestamp/);
  });
});
