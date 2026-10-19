// Next 15 hands dynamic params to pages still percent-encoded, so a username
// like "ana+regalos" arrives as "ana%2Bregalos" and never matches the DB row.
export function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
