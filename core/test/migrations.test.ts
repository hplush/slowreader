import { deepEqual, equal } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { migrations } from '../migrations.ts'

describe('migrations', () => {
  test('converts posts from subprotocol 0', () => {
    let media = [{ type: 'image', url: 'https://example.com/a.png' }]
    deepEqual(
      migrations[1]!(
        {
          fields: { media: JSON.stringify(media), read: 1, title: 'A' },
          id: 'post',
          type: 'posts/created'
        },
        {}
      ),
      {
        fields: { media, read: true, title: 'A' },
        id: 'post',
        type: 'posts/created'
      }
    )
    deepEqual(
      migrations[1]!(
        { fields: { read: 0 }, ids: ['a', 'b'], type: 'posts/changed' },
        {}
      ),
      { fields: { read: false }, ids: ['a', 'b'], type: 'posts/changed' }
    )
    deepEqual(
      migrations[1]!(
        {
          records: [{ id: 'a', media: JSON.stringify(media), read: 0 }],
          type: 'posts/created'
        },
        {}
      ),
      { records: [{ id: 'a', media, read: false }], type: 'posts/created' }
    )
    deepEqual(
      migrations[1]!(
        { fields: { publishedAt: 10 }, id: 'post', type: 'posts/created' },
        {}
      ),
      {
        fields: { publishedAt: 10, sortedAt: 10 },
        id: 'post',
        type: 'posts/created'
      }
    )
  })

  test('keeps other actions', () => {
    let feed = { fields: { read: 1 }, id: 'feed', type: 'feeds/changed' }
    equal(migrations[1]!(feed, {}), feed)
    let deleted = { id: 'post', type: 'posts/deleted' }
    equal(migrations[1]!(deleted, {}), deleted)
  })
})
