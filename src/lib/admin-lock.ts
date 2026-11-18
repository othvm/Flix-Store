/**
 * Admin Dashboard Access Gate
 *
 * Defaults to false (unlocked). Can be locked via ADMIN_ACCESS_LOCKED=true env var if needed.
 */
export const ADMIN_ACCESS_LOCKED =
  typeof process !== "undefined" && process.env?.ADMIN_ACCESS_LOCKED === "true";
