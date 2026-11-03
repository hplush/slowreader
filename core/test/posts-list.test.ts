import { restoreAll, spyOn } from 'nanospy'
import { equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  createPostsList,
  getPostsFrequency,
  isTooFrequent,
  type ParsedPost
} from '../index.ts'

describe('posts list', () => {
  beforeEach(() => {
    spyOn(Date, 'now', () => 100 * 86400 * 1000)
  })

  afterEach(() => {
    restoreAll()
  })

  function daysAgo(days: number): number {
    return (100 - days) * 86400
  }

  function frequency(posts: ParsedPost[]): number | undefined {
    return getPostsFrequency(createPostsList(() => [posts, undefined]))
  }

  test('has no frequency without dates', () => {
    equal(frequency([]), undefined)
    equal(frequency([{ originId: '1' }]), undefined)
  })

  test('counts posts per day', () => {
    equal(
      frequency(
        Array.from({ length: 30 }, (_, i) => ({
          originId: `${i}`,
          publishedAt: daysAgo(i / 10)
        }))
      ),
      10
    )
    equal(
      frequency([
        { originId: '1', publishedAt: daysAgo(1) },
        { originId: '2', publishedAt: daysAgo(10) }
      ]),
      0.2
    )
  })

  test('does not overestimate a single recent post', () => {
    equal(frequency([{ originId: '1', publishedAt: daysAgo(0.01) }]), 1)
  })

  test('counts reposts by repost time and skips thread parts', () => {
    equal(
      frequency([
        { originId: '3', publishedAt: daysAgo(1), selfReplyTo: '2' },
        { originId: '2', publishedAt: daysAgo(1), selfReplyTo: '1' },
        { originId: '1', publishedAt: daysAgo(2) },
        { originId: 'r', publishedAt: daysAgo(90), sortedAt: daysAgo(1) }
      ]),
      1
    )
  })

  test('detects too frequent feeds', () => {
    equal(isTooFrequent(10), false)
    equal(isTooFrequent(11), true)
  })
})
