import { deepStrictEqual, equal, match, throws } from 'node:assert'
import { test } from 'node:test'

import { config, getConfig } from '../lib/config.ts'

const DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

test('throws on missed DATABASE_URL in production', () => {
  throws(() => {
    getConfig({ NODE_ENV: 'production' })
  }, /Set DATABASE_URL with PostgreSQL credentials/)
  equal(
    getConfig({
      DATABASE_URL,
      NODE_ENV: 'production'
    }).db,
    DATABASE_URL
  )
  equal(getConfig({ NODE_ENV: 'test' }).db, 'memory://')
  equal(getConfig({ DATABASE_URL, NODE_ENV: 'test' }).db, DATABASE_URL)
  equal(getConfig({ NODE_ENV: 'development' }).db, 'file://./db/pgdata')
  equal(getConfig({ DATABASE_URL, NODE_ENV: 'development' }).db, DATABASE_URL)
})

test('checks environment', () => {
  equal(getConfig({}).env, 'development')
  equal(getConfig({ NODE_ENV: 'test' }).env, 'test')
  throws(() => {
    getConfig({ NODE_ENV: 'staging' })
  }, /NODE_ENV/)
  equal(getConfig({}).staging, false)
  equal(getConfig({ STAGING: '1' }).staging, true)
})

test('sets proxy origin', () => {
  match(getConfig({ NODE_ENV: 'development' }).proxyOrigin!, /localhost/)
  equal(
    getConfig({ DATABASE_URL, NODE_ENV: 'production' }).proxyOrigin,
    undefined
  )
  equal(
    getConfig({
      DATABASE_URL,
      NODE_ENV: 'production',
      PROXY_ORIGIN: '^http:\\/\\/slowreader.app$'
    }).proxyOrigin,
    '^http:\\/\\/slowreader.app$'
  )
})

test('passes keys', () => {
  deepStrictEqual(
    getConfig({
      ASSETS: '1',
      DATABASE_URL,
      DEBUG: '1',
      NODE_ENV: 'production',
      PROXY_ORIGIN: '^http:\\/\\/slowreader.app$'
    }),
    {
      assets: true,
      db: DATABASE_URL,
      debug: true,
      env: 'production',
      proxyOrigin: '^http:\\/\\/slowreader.app$',
      staging: false
    }
  )
})

test('has predefined config', () => {
  equal(config.env, 'test')
  equal(config.debug, false)
})
