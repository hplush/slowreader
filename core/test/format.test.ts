import type { Formatter } from '@nanostores/i18n'
import { equal, match } from 'node:assert/strict'
import { test } from 'node:test'

import { formatPublishedAt } from '../format.ts'

function createMockFormatter(): Formatter {
  return {
    number: () => '',
    relativeTime: (num, unit) => `${num} ${unit}`,
    time: date => {
      let d = date instanceof Date ? date : new Date(date ?? 0)
      return d.toISOString()
    }
  }
}

test('formats time as minutes ago when less than hour', () => {
  let format = createMockFormatter()
  let thirtyMinutesAgo = Math.floor((Date.now() - 30 * 60 * 1000) / 1000)

  let result = formatPublishedAt(format, thirtyMinutesAgo)

  equal(result, '-30 minute')
})

test('formats time as hours ago when less than day', () => {
  let format = createMockFormatter()
  let threeHoursAgo = Math.floor((Date.now() - 3 * 60 * 60 * 1000) / 1000)

  let result = formatPublishedAt(format, threeHoursAgo)

  equal(result, '-3 hour')
})

test('formats time as full date when more than day', () => {
  let format = createMockFormatter()
  let twoDaysAgo = Math.floor((Date.now() - 2 * 24 * 60 * 60 * 1000) / 1000)

  let result = formatPublishedAt(format, twoDaysAgo)

  match(result, /^\d{4}-\d{2}-\d{2}T/)
})
