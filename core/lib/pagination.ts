import { atom, type WritableAtom } from 'nanostores'

export type PaginationValue = {
  count: number
  hasNext: boolean
  page: number
  pages: number[]
  show: boolean
}

export function createPagination(
  all: number,
  perPage: number
): WritableAtom<PaginationValue> {
  return setPagination(
    atom<PaginationValue>({
      count: 0,
      hasNext: false,
      page: 0,
      pages: [],
      show: false
    }),
    all,
    perPage
  )
}

export function setPagination(
  pagination: WritableAtom<PaginationValue>,
  all: number,
  perPage: number
): WritableAtom<PaginationValue> {
  let count = Math.ceil(all / perPage)
  pagination.set({
    count,
    hasNext: all > perPage,
    page: 0,
    pages: Array.from({ length: count }, (_, i) => i),
    show: count > 1
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
