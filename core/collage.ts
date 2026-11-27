import { isRoundVideo, isSticker, type ReaderMedia } from './post.ts'

export type CollageCell = { media: ReaderMedia; shape: number }

export type CollageBlock =
  | { cells: CollageCell[]; shape: number; type: 'column' }
  | ({ type: 'cell' } & CollageCell)

export type CollageRow = { blocks: CollageBlock[]; shape: number }

export type MediaCollage = {
  other: ReaderMedia[]
  rows: CollageRow[]
}

type Candidate = {
  column: boolean
  counts: number[]
  height: number
  rows: CollageRow[]
  smallest: number
}

function isVisual(media: ReaderMedia): boolean {
  if (media.type.startsWith('image')) return !isSticker(media)
  if (media.type.startsWith('video')) return !isRoundVideo(media)
  return false
}

function toCell(media: ReaderMedia): CollageCell {
  let width = media.size?.width
  let height = media.size?.height
  let shape = width && height ? width / height : 1
  return { media, shape: Math.min(3, Math.max(0.5, shape)) }
}

function splitToCounts(total: number, rows: number): number[][] {
  if (rows === 1) return total >= 1 && total <= 4 ? [[total]] : []
  let result: number[][] = []
  for (let first = 4; first >= 1; first--) {
    for (let rest of splitToCounts(total - first, rows - 1)) {
      result.push([first, ...rest])
    }
  }
  return result
}

function toRow(cells: CollageCell[]): CollageRow {
  return {
    blocks: cells.map(cell => ({ type: 'cell', ...cell })),
    shape: cells.reduce((sum, cell) => sum + cell.shape, 0)
  }
}

function rowsCandidate(cells: CollageCell[], counts: number[]): Candidate {
  let rows: CollageRow[] = []
  let height = 0
  let smallest = Infinity
  let start = 0
  for (let count of counts) {
    let row = toRow(cells.slice(start, start + count))
    start += count
    let rowHeight = 1 / row.shape
    height += rowHeight
    for (let block of row.blocks) {
      smallest = Math.min(smallest, rowHeight, block.shape * rowHeight)
    }
    rows.push(row)
  }
  return { column: false, counts, height, rows, smallest }
}

function columnCandidate(cells: CollageCell[]): Candidate {
  let [first, ...stacked] = cells as [CollageCell, ...CollageCell[]]
  let shape = 1 / stacked.reduce((sum, cell) => sum + 1 / cell.shape, 0)
  let height = 1 / (first.shape + shape)
  let right = shape * height
  let smallest = Math.min(first.shape * height, height, right)
  for (let cell of stacked) smallest = Math.min(smallest, right / cell.shape)
  return {
    column: true,
    counts: [cells.length],
    height,
    rows: [
      {
        blocks: [
          { type: 'cell', ...first },
          { cells: stacked, shape, type: 'column' }
        ],
        shape: first.shape + shape
      }
    ],
    smallest
  }
}

function score(candidate: Candidate): number {
  let growing = candidate.counts.some((count, index) => {
    return index > 0 && count > candidate.counts[index - 1]!
  })
  return Math.abs(candidate.height - 0.6) * (growing ? 1.2 : 1)
}

function isBetter(a: Candidate, b: Candidate): boolean {
  let diff = score(a) - score(b)
  if (Math.abs(diff) > 1e-9) return diff < 0
  if (a.column !== b.column) return a.column
  if (a.counts.length !== b.counts.length) {
    return a.counts.length < b.counts.length
  }
  let index = a.counts.findIndex((count, i) => count !== b.counts[i])
  return index !== -1 && a.counts[index]! > b.counts[index]!
}

function layoutPiece(cells: CollageCell[]): CollageRow[] {
  let candidates: Candidate[] = []
  if (cells.length === 3 || cells.length === 4) {
    candidates.push(columnCandidate(cells))
  }
  for (let rows = 1; rows <= 4; rows++) {
    for (let counts of splitToCounts(cells.length, rows)) {
      candidates.push(rowsCandidate(cells, counts))
    }
  }
  let allowed = candidates.filter(i => i.smallest >= 0.2)
  if (allowed.length === 0) {
    return candidates.reduce((a, b) => (b.smallest > a.smallest ? b : a)).rows
  }
  return allowed.reduce((a, b) => (isBetter(b, a) ? b : a)).rows
}

/**
 * Albums longer than 10 are cut into near-equal pieces, so the row search
 * stays small and the last row does not get a lonely photo.
 */
export function getMediaCollage(media: ReaderMedia[]): MediaCollage {
  let visual = media.filter(isVisual)
  if (visual.length < 2) return { other: media, rows: [] }
  let pieces = Math.ceil(visual.length / 10)
  let rows: CollageRow[] = []
  let start = 0
  for (let piece = 0; piece < pieces; piece++) {
    let size =
      Math.floor(visual.length / pieces) +
      (piece < visual.length % pieces ? 1 : 0)
    rows.push(...layoutPiece(visual.slice(start, start + size).map(toCell)))
    start += size
  }
  return { other: media.filter(i => !isVisual(i)), rows }
}
