/**
 * Unix time in seconds, as times are kept in the database.
 */
export function nowInSeconds(): number {
  return Math.round(Date.now() / 1000)
}

/**
 * UTC date like `2026-01-31` to compare days in a string storage.
 */
export function getToday(): string {
  return new Date().toISOString().slice(0, 10)
}
