import { deepEqual, equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { blurhashToImage } from '../../lib/blurhash.ts'

function readImage(url: string | undefined): {
  height: number
  pixels: number[][]
  width: number
} {
  let bytes = Buffer.from(url!.replace('data:image/bmp;base64,', ''), 'base64')
  let width = bytes.readUInt32LE(18)
  let height = bytes.readUInt32LE(22)
  let line = (bytes.length - 54) / height
  let pixels: number[][] = []
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let start = 54 + (height - 1 - y) * line + x * 3
      pixels.push([...bytes.subarray(start, start + 3)].toReversed())
    }
  }
  return { height, pixels, width }
}

describe('blurhash', () => {
  test('converts one color to the picture', () => {
    equal(
      blurhashToImage('00TI:j', 2),
      'data:image/bmp;base64,Qk2WAAAAAAAAADYAAAAoAAAACAAAAAQAAAABABgA' +
        'A'.repeat(32) +
        'AAD/'.repeat(32)
    )
    deepEqual(
      readImage(blurhashToImage('00TI:j', 2)).pixels,
      Array.from({ length: 32 }, () => [255, 0, 0])
    )
  })

  test('keeps the shape of the image', () => {
    let wide = readImage(blurhashToImage('LEHV6nWB2yk8pyo0adR*.7kCMdnj', 1.5))
    equal(wide.width, 8)
    equal(wide.height, 5)
    deepEqual(wide.pixels[0], [135, 164, 177])
    deepEqual(wide.pixels[1], [143, 167, 177])

    let tall = readImage(blurhashToImage('LEHV6nWB2yk8pyo0adR*.7kCMdnj', 0.5))
    equal(tall.width, 4)
    equal(tall.height, 8)
    deepEqual(tall.pixels[0], [135, 164, 177])

    let unknown = readImage(blurhashToImage('LEHV6nWB2yk8pyo0adR*.7kCMdnj'))
    equal(unknown.width, 8)
    equal(unknown.height, 8)

    let line = readImage(blurhashToImage('00TI:j', 100))
    equal(line.width, 8)
    equal(line.height, 1)
  })

  test('ignores broken strings', () => {
    equal(blurhashToImage(''), undefined)
    equal(blurhashToImage('00TI: '), undefined)
    equal(blurhashToImage('LEHV6nWB2yk8pyo0adR*.7kCMdn'), undefined)
  })
})
