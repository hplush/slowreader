/**
 * The `load` event fires before `decoding="async"` image is painted,
 * so removing a placeholder on `load` shows an empty box for a moment.
 */
export async function waitImageDecoded(image: unknown): Promise<void> {
  if (image instanceof HTMLImageElement) {
    await image.decode().catch(() => {})
  }
}
