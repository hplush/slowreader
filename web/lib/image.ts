/**
 * The `load` event fires before `decoding="async"` image is painted,
 * so removing a placeholder on `load` shows an empty box for a moment.
 */
export async function waitImageDecoded(image: unknown): Promise<void> {
  if (image instanceof HTMLImageElement) {
    await image.decode().catch(() => {})
  }
}

/**
 * Tiny preview from the post looks like a broken photo without blur,
 * and CSS can’t blur only the background of `<img>`.
 */
export function blurredBackground(
  url: string,
  width?: null | number,
  height?: null | number
): string {
  let ratio = width && height ? (100 * height) / width : 56.25
  return `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 ${ratio}">` +
      '<filter id="blur" color-interpolation-filters="sRGB">' +
      '<feGaussianBlur stdDeviation="5"/>' +
      // Blur makes the edges of the image transparent
      '<feComponentTransfer><feFuncA type="discrete" tableValues="1 1"/>' +
      '</feComponentTransfer></filter>' +
      `<image filter="url(#blur)" width="100" height="${ratio}" ` +
      `preserveAspectRatio="xMidYMid slice" href="${url}"/></svg>`
  )}")`
}
