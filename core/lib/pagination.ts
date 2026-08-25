import { atom, type WritableAtom } from 'nanostores'

export type PaginationValue = {
  count: number
  hasNext: boolean
  page: number
  pages: number[]
  show: boolean
  titles: boolean
}

/**
 * The pagination is around 500 px wide and a 2 px block is still clickable,
 * so longer paginations show every n-th page instead of a block per page.
 */
const MAX_BLOCKS = 250

/**
 * Page number needs around 30 px to be readable.
 */
const MAX_TITLES = 16

function calcPages(count: number): number[] {
  if (count <= MAX_BLOCKS) {
    return Array.from({ length: count }, (_, i) => i)
  } else {
    return Array.from({ length: MAX_BLOCKS }, (_, i) => {
      return Math.round((i * (count - 1)) / (MAX_BLOCKS - 1))
    })
  }
}

export function createPagination(count: number): WritableAtom<PaginationValue> {
  return setPagination(
    atom<PaginationValue>({
      count: 0,
      hasNext: false,
      page: 0,
      pages: [],
      show: false,
      titles: false
    }),
    count
  )
}

export function setPagination(
  pagination: WritableAtom<PaginationValue>,
  count: number
): WritableAtom<PaginationValue> {
  pagination.set({
    count,
    hasNext: count > 1,
    page: 0,
    pages: calcPages(count),
    show: count > 1,
    titles: count <= MAX_TITLES
  })
  return pagination
}

export function moveToPage(
  pagination: WritableAtom<PaginationValue>,
  page: number
): void {
  let prev = pagination.get()
  pagination.set({
    ...prev,
    hasNext: prev.count > page + 1,
    page
  })
}
