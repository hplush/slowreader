import { deepEqual, equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  getMediaCollage,
  type MediaCollage,
  type ReaderMedia
} from '../index.ts'

let last = 0

function photo(width?: number, height?: number, type = 'image'): ReaderMedia {
  return {
    type,
    url: `https://example.com/${++last}`,
    ...(width && height ? { size: { height, width } } : {})
  }
}

function photos(count: number, width: number, height: number): ReaderMedia[] {
  return Array.from({ length: count }, () => photo(width, height))
}

function describeLayout(collage: MediaCollage): string {
  let height = collage.rows.reduce((sum, row) => sum + 1 / row.shape, 0)
  let counts = collage.rows.map(row => {
    let column = row.blocks.find(block => block.type === 'column')
    return column ? `column 1 + ${column.cells.length}` : row.blocks.length
  })
  return `${counts.join(' + ')}, ${Math.round(height * 488)} px`
}

function layout(media: ReaderMedia[]): string {
  return describeLayout(getMediaCollage(media))
}

function landscape(): ReaderMedia {
  return photo(4, 3)
}

function portrait(): ReaderMedia {
  return photo(3, 4)
}

describe('collage', () => {
  test('chooses layout like Telegram but more compact', () => {
    equal(layout(photos(2, 4, 3)), '2, 183 px')
    equal(layout(photos(2, 3, 4)), '2, 325 px')
    equal(layout(photos(2, 16, 9)), '2, 137 px')
    equal(layout([landscape(), portrait()]), '2, 234 px')
    equal(layout(photos(3, 4, 3)), 'column 1 + 2, 244 px')
    equal(
      layout([portrait(), landscape(), landscape()]),
      'column 1 + 2, 344 px'
    )
    equal(layout(photos(3, 3, 4)), '3, 217 px')
    equal(layout([landscape(), portrait(), portrait()]), 'column 1 + 2, 286 px')
    equal(layout(photos(3, 1, 1)), 'column 1 + 2, 325 px')
    equal(layout(photos(4, 4, 3)), '2 + 2, 366 px')
    equal(layout(photos(4, 3, 4)), '4, 163 px')
    equal(layout(photos(4, 1, 1)), 'column 1 + 3, 366 px')
    equal(
      layout([portrait(), landscape(), landscape(), landscape()]),
      'column 1 + 3, 409 px'
    )
    equal(layout(photos(4, 16, 9)), '2 + 2, 275 px')
    equal(layout(photos(5, 4, 3)), '3 + 2, 305 px')
    equal(layout(photos(5, 3, 4)), '3 + 2, 542 px')
    equal(layout(photos(6, 4, 3)), '3 + 3, 244 px')
    equal(layout(photos(7, 4, 3)), '3 + 2 + 2, 488 px')
    equal(layout(photos(9, 4, 3)), '3 + 3 + 3, 366 px')
    equal(layout(photos(10, 4, 3)), '3 + 3 + 2 + 2, 610 px')
    equal(layout(photos(10, 3, 4)), '4 + 3 + 3, 596 px')
    let mixed = Array.from({ length: 10 }, (_, i) =>
      i % 2 ? portrait() : landscape()
    )
    equal(layout(mixed), '3 + 3 + 2 + 2, 784 px')
  })

  test('clamps extreme shapes', () => {
    equal(layout([photo(3, 1), landscape(), landscape()]), '1 + 2, 346 px')
    equal(layout(photos(2, 4, 1)), '1 + 1, 325 px')
    equal(layout([photo(9, 19.5), landscape()]), '2, 266 px')
    deepEqual(
      getMediaCollage([photo(4, 1), landscape()]).rows[0]?.blocks.map(block => {
        return block.type === 'cell' ? block.shape : 0
      }),
      [3, 4 / 3]
    )
  })

  test('uses square for unknown size', () => {
    equal(layout([photo(), photo()]), '2, 244 px')
    let collage = getMediaCollage([photo(), landscape()])
    deepEqual(
      collage.rows[0]?.blocks.map(block => {
        return block.type === 'cell' ? block.shape : 0
      }),
      [1, 4 / 3]
    )
  })

  test('splits big albums to pieces', () => {
    equal(layout(photos(11, 4, 3)), '3 + 3 + 3 + 2, 549 px')
    equal(layout(photos(12, 4, 3)), '3 + 3 + 3 + 3, 488 px')
    equal(
      layout(photos(23, 4, 3)),
      '3 + 3 + 2 + 3 + 3 + 2 + 3 + 2 + 2, 1342 px'
    )
    let media = photos(30, 4, 3)
    deepEqual(
      getMediaCollage(media).rows.flatMap(row => {
        return row.blocks.flatMap(block => {
          return block.type === 'cell'
            ? [block.media]
            : block.cells.map(i => i.media)
        })
      }),
      media
    )
  })

  test('keeps other media outside of collage', () => {
    let sticker = photo(512, 512, 'image;mode=sticker')
    let round = photo(240, 240, 'video;mode=round')
    let audio = photo(undefined, undefined, 'audio')
    let file = photo(undefined, undefined, 'application/pdf')
    let video = photo(16, 9, 'video')
    let gif = photo(4, 3, 'video;mode=gif')
    let first = landscape()
    let collage = getMediaCollage([
      sticker,
      first,
      audio,
      video,
      round,
      gif,
      file
    ])
    deepEqual(collage.other, [sticker, audio, round, file])
    deepEqual(
      collage.rows.flatMap(row => {
        return row.blocks.flatMap(block => {
          return block.type === 'cell'
            ? [block.media]
            : block.cells.map(i => i.media)
        })
      }),
      [first, video, gif]
    )
  })

  test('ignores single visual item', () => {
    let media = [landscape(), photo(512, 512, 'image;mode=sticker'), photo()]
    media[2] = { ...media[2]!, type: 'audio' }
    deepEqual(getMediaCollage(media), { other: media, rows: [] })
    deepEqual(getMediaCollage([]), { other: [], rows: [] })
  })
})
