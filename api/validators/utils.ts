export function isObject(body: unknown): body is object {
  return typeof body === 'object' && body !== null
}

export function isEmptyObject(body: unknown): body is Record<string, never> {
  return isObject(body) && Object.keys(body).length === 0
}

export function hasKey<Key extends string>(
  body: unknown,
  key: Key
): body is Record<Key, unknown> {
  return isObject(body) && key in body
}

export function hasStringKey<Key extends string>(
  body: unknown,
  key: Key
): body is Record<Key, string> {
  return hasKey(body, key) && typeof body[key] === 'string'
}

export function hasOnlyKeys(value: object, keys: string[]): boolean {
  return Object.keys(value).every(key => keys.includes(key))
}
