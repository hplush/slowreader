export function removeProtocol(dirtyUrl: string): string {
  return dirtyUrl.replace(/^https?:\/\//, '')
}
