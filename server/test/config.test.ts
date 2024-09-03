import { deepStrictEqual, equal, throws } from 'node:assert'
import { test } from 'node:test'

import { config, getConfig } from '../config.ts'

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

test('checks that assets is together with routes', () => {
  throws(() => {
    getConfig({ ASSETS_DIR: './dist/' })
  }, /ASSETS_DIR and ROUTES_FILE/)
  throws(() => {
    getConfig({ ROUTES_FILE: './routes.regexp' })
  }, /ASSETS_DIR and ROUTES_FILE/)
})

test('checks NODE_ENV', () => {
  equal(getConfig({}).env, 'development')
  equal(getConfig({ NODE_ENV: 'test' }).env, 'test')
  throws(() => {
    getConfig({ NODE_ENV: 'staging' })
  }, /NODE_ENV/)
})

test('passes keys', () => {
  deepStrictEqual(
    getConfig({
      ASSETS_DIR: './dist/',
      DATABASE_URL,
      NODE_ENV: 'production',
      ROUTES_FILE: './routes.regexp'
    }),
    {
      assets: './dist/',
      db: DATABASE_URL,
      env: 'production',
      routes: './routes.regexp'
    }
  )
})

test('has predefined config', () => {
  equal(config.env, 'test')
})
