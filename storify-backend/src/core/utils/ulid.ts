import { ulid as generateRawUlid, decodeTime } from "ulid";

/**
 * Crockford's Base32 alphabet: 0123456789ABCDEFGHJKMNPQRSTVWXYZ
 * Excludes I, L, O, U to avoid confusion with 1, 0, V.
 * Length: Exactly 26 characters.
 */
export const ULID_REGEX = /^[0-9A-HJKMNP-TV-Z]{26}$/;

/**
 * Generates a new 26-character Crockford Base32 ULID.
 * Lexicographically sortable and compatible with PostgreSQL ltree labels.
 */
export function generateUlid(seedTime?: number): string {
  return generateRawUlid(seedTime);
}

/**
 * Validates whether a given string is a valid 26-character Crockford Base32 ULID.
 */
export function isValidUlid(id: unknown): id is string {
  if (typeof id !== "string") {
    return false;
  }
  return ULID_REGEX.test(id);
}

/**
 * Extracts the 48-bit UNIX timestamp (in milliseconds) from a ULID.
 */
export function getUlidTimestamp(id: string): number {
  if (!isValidUlid(id)) {
    throw new Error(`Cannot extract timestamp from invalid ULID: "${id}"`);
  }
  return decodeTime(id);
}
