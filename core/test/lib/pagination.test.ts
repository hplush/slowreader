import { deepEqual, equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createPagination, moveToPage, setPagination } from '../../index.ts'

describe('pagination', () => {
  test('shows a block for every page of a short pagination', () => {
    let pagination = createPagination(3)
    deepEqual(pagination.get(), {
      count: 3,
      hasNext: true,
      page: 0,
      pages: [0, 1, 2],
      show: true,
      titles: true
    })

    setPagination(pagination, 1)
    deepEqual(pagination.get(), {
      count: 1,
      hasNext: false,
      page: 0,
      pages: [0],
      show: false,
      titles: true
    })
  })

  test('hides page numbers when they do not fit', () => {
    equal(createPagination(16).get().titles, true)
    equal(createPagination(17).get().titles, false)
    equal(createPagination(17).get().pages.length, 17)
  })

  test('shows every n-th page of a long pagination', () => {
    let pages = createPagination(1000).get().pages
    equal(pages.length, 250)
    equal(pages[0], 0)
    equal(pages[249], 999)
    equal(
      pages.every((page, i) => i === 0 || page > pages[i - 1]!),
      true
    )
  })

  test('moves to the page keeping blocks', () => {
    let pagination = createPagination(300)
    moveToPage(pagination, 299)
    deepEqual(pagination.get().pages.length, 250)
    equal(pagination.get().page, 299)
    equal(pagination.get().hasNext, false)

    moveToPage(pagination, 1)
    equal(pagination.get().hasNext, true)
  })
})
