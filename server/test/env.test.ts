import { deepStrictEqual, equal, throws } from 'node:assert'
import { test } from 'node:test'

import { getEnv } from '../env.ts'

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

test('throws on missed DATABASE_URL in production', () => {
  throws(() => {
    getEnv({ NODE_ENV: 'production' })
  }, /Set DATABASE_URL with PostgreSQL credentials/)
  equal(
    getEnv({
      DATABASE_URL,
      NODE_ENV: 'production'
    }).DATABASE_URL,
    DATABASE_URL
  )
  equal(getEnv({ NODE_ENV: 'test' }).DATABASE_URL, undefined)
  equal(getEnv({ DATABASE_URL, NODE_ENV: 'test' }).DATABASE_URL, DATABASE_URL)
})

test('passes keys', () => {
  deepStrictEqual(
    getEnv({
      DATABASE_URL,
      NODE_ENV: 'production'
    }),
    {
      DATABASE_URL,
      NODE_ENV: 'production'
    }
  )
})
