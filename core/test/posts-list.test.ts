import { restoreAll, spyOn } from 'nanospy'
import { deepEqual, equal } from 'node:assert/strict'
import { afterEach, beforeEach, describe, test } from 'node:test'

import {
  createPostsList,
  getPostsActivity,
  getPostsFrequency,
  isTooFrequent,
  type ParsedPost,
  type PostsActivity
} from '../index.ts'

describe('posts list', () => {
  beforeEach(() => {
    spyOn(Date, 'now', () => 1000 * 86400 * 1000)
  })

  afterEach(() => {
    restoreAll()
  })

  function daysAgo(days: number): number {
    return (1000 - days) * 86400
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

  test('counts only posts of the last year', () => {
    let old = Array.from({ length: 100 }, (_, i) => ({
      originId: `old${i}`,
      publishedAt: daysAgo(400 + i)
    }))
    equal(frequency(old), 0)
    equal(
      frequency([{ originId: '1', publishedAt: daysAgo(10) }, ...old]),
      0.0027
    )
  })

  test('shows last post for dead feeds', () => {
    function activity(days: number): PostsActivity | undefined {
      return getPostsActivity(
        createPostsList(() => [
          [
            { originId: '1', publishedAt: daysAgo(days) },
            { originId: '2', publishedAt: daysAgo(days + 9) }
          ],
          undefined
        ])
      )
    }
    equal(getPostsActivity(createPostsList(() => [[], undefined])), undefined)
    deepEqual(activity(1), { frequency: 0.2, dead: false })
    deepEqual(activity(180), { frequency: 0.011, dead: false })
    deepEqual(activity(200), {
      abandoned: false,
      lastPostAt: daysAgo(200),
      dead: true
    })
    deepEqual(activity(400), {
      abandoned: true,
      lastPostAt: daysAgo(400),
      dead: true
    })
  })

  test('detects too frequent feeds', () => {
    equal(isTooFrequent(10), false)
    equal(isTooFrequent(11), true)
  })
})
