const CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  'abcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~'

function toNumber(text: string): number {
  let result = 0
  for (let char of text) result = result * 83 + CHARS.indexOf(char)
  return result
}

function toLinear(value: number): number {
  let part = value / 255
  return part <= 0.04045 ? part / 12.92 : ((part + 0.055) / 1.055) ** 2.4
}

function toByte(value: number): number {
  let part = Math.max(0, Math.min(1, value))
  return Math.trunc(
    (part <= 0.0031308 ? part * 12.92 : 1.055 * part ** (1 / 2.4) - 0.055) *
      255 +
      0.5
  )
}

/**
 * Tiny picture as `data:` URL from BlurHash string, which some services
 * put into the post instead of a preview. `ratio` is width divided by height
 * of the original image.
 */
export function blurhashToImage(hash: string, ratio = 1): string | undefined {
  if (hash.split('').some(char => !CHARS.includes(char))) return undefined
  let flag = toNumber(hash.slice(0, 1))
  let columns = (flag % 9) + 1
  let rows = Math.floor(flag / 9) + 1
  if (hash.length !== 4 + 2 * columns * rows) return undefined
  let max = (toNumber(hash.slice(1, 2)) + 1) / 166
  let colors = Array.from({ length: columns * rows }, (_, index) => {
    if (index === 0) {
      let average = toNumber(hash.slice(2, 6))
      return [average >> 16, (average >> 8) & 255, average & 255].map(toLinear)
    }
    let value = toNumber(hash.slice(4 + index * 2, 6 + index * 2))
    return [
      Math.floor(value / 361),
      Math.floor(value / 19) % 19,
      value % 19
    ].map(part => Math.sign(part - 9) * ((part - 9) / 9) ** 2 * max)
  })

  let width = ratio < 1 ? Math.max(1, Math.round(8 * ratio)) : 8
  let height = ratio > 1 ? Math.max(1, Math.round(8 / ratio)) : 8
  let line = Math.ceil((width * 3) / 4) * 4
  let bytes = new Uint8Array(54 + line * height)
  let view = new DataView(bytes.buffer)
  bytes.set([66, 77])
  view.setUint32(2, bytes.length, true)
  view.setUint32(10, 54, true)
  view.setUint32(14, 40, true)
  view.setUint32(18, width, true)
  view.setUint32(22, height, true)
  view.setUint16(26, 1, true)
  view.setUint16(28, 24, true)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let pixel = [0, 0, 0]
      colors.forEach((color, index) => {
        let wave =
          Math.cos((Math.PI * x * (index % columns)) / width) *
          Math.cos((Math.PI * y * Math.floor(index / columns)) / height)
        pixel = pixel.map((sum, channel) => sum + color[channel]! * wave)
      })
      // BMP keeps lines from bottom to top and colors as blue, green, red
      bytes.set(
        pixel.toReversed().map(toByte),
        54 + (height - 1 - y) * line + x * 3
      )
    }
  }
  return `data:image/bmp;base64,${btoa(String.fromCharCode(...bytes))}`
}
