import { deepEqual, equal, match, throws } from 'node:assert/strict'
import { describe, test } from 'node:test'

import { config, getConfig } from '../lib/config.ts'

describe('server config', () => {
  let DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
  let WEB_ORIGIN = 'https://slowreader.app'

  test('throws on missed DATABASE_URL in production', () => {
    throws(() => {
      getConfig({ NODE_ENV: 'production', WEB_ORIGIN })
    }, /Set DATABASE_URL with PostgreSQL credentials/)
    equal(
      getConfig({
        DATABASE_URL,
        NODE_ENV: 'production',
        WEB_ORIGIN
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
      getConfig({ DATABASE_URL, NODE_ENV: 'production', WEB_ORIGIN })
        .proxyOrigin,
      undefined
    )
    equal(
      getConfig({
        DATABASE_URL,
        NODE_ENV: 'production',
        PROXY_ORIGIN: '^http:\\/\\/slowreader.app$',
        WEB_ORIGIN
      }).proxyOrigin,
      '^http:\\/\\/slowreader.app$'
    )
  })

  test('passes keys', () => {
    deepEqual(
      getConfig({
        ASSETS: '1',
        BEHIND_BALANCER: '1',
        DATABASE_URL,
        DEBUG: '1',
        NODE_ENV: 'production',
        PROXY_ORIGIN: '^http:\\/\\/slowreader.app$',
        WEB_ORIGIN: 'https://slowreader.app/'
      }),
      {
        assets: true,
        behindBalancer: true,
        db: DATABASE_URL,
        debug: true,
        env: 'production',
        proxyOrigin: '^http:\\/\\/slowreader.app$',
        staging: false,
        webOrigin: 'https://slowreader.app'
      }
    )
  })

  test('sets web origin', () => {
    throws(() => {
      getConfig({ DATABASE_URL, NODE_ENV: 'production' })
    }, /Set WEB_ORIGIN/)
    let dev = getConfig({})
    equal(dev.webOrigin, 'http://localhost:2553')
    let preview = getConfig({
      DATABASE_URL,
      NODE_ENV: 'production',
      WEB_ORIGIN: 'https://preview-1.slowreader.hplush.dev'
    })
    equal(preview.webOrigin, 'https://preview-1.slowreader.hplush.dev')
  })

  test('has predefined config', () => {
    equal(config.env, 'test')
    equal(config.debug, false)
  })
})
