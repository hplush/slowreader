/**
 * The same ID on every device prevents duplicates.
 *
 * The hash is cyrb53. `crypto.subtle.digest()` hashes better, but it is async.
 */
export function getStableId(key: string): string {
  let hash1 = 0xdeadbeef
  let hash2 = 0x41c6ce57
  for (let i = 0; i < key.length; i++) {
    let code = key.charCodeAt(i)
    hash1 = Math.imul(hash1 ^ code, 2654435761)
    hash2 = Math.imul(hash2 ^ code, 1597334677)
  }
  hash1 =
    Math.imul(hash1 ^ (hash1 >>> 16), 2246822507) ^
    Math.imul(hash2 ^ (hash2 >>> 13), 3266489909)
  hash2 =
    Math.imul(hash2 ^ (hash2 >>> 16), 2246822507) ^
    Math.imul(hash1 ^ (hash1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & hash2) + (hash1 >>> 0)).toString(36)
}
