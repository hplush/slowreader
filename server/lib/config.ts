import { DEFAULT_PROXY_CONFIG } from '@slowreader/proxy'
import { join } from 'node:path'

export type Config = {
  analyticsIps: string[]
  analyticsToken: string | undefined
  db: string
  dbCa: string | undefined
  debug: boolean
  env: 'development' | 'production' | 'test'
  proxyMaxMediaSize: number
  proxyOrigin: string | undefined
  staging: boolean
  webOrigin: string
}

function getDefaultDatabase(env: Config['env']): string {
  if (env === 'production') {
    throw new Error('Set DATABASE_URL with PostgreSQL credentials')
  } else if (env === 'test') {
    return 'memory://'
  } else {
    return `file://${join(import.meta.dirname, '../db/pgdata')}`
  }
}

function getDefaultWebOrigin(env: Config['env']): string {
  if (env === 'production') {
    throw new Error('Set WEB_ORIGIN with the web client origin')
  } else if (env === 'test') {
    return 'https://test.slowreader.app'
  } else {
    return 'http://127.0.0.1:2553'
  }
}

export function getConfig(from: Record<string, string | undefined>): Config {
  let env = from.NODE_ENV ?? 'development'
  if (env !== 'test' && env !== 'production' && env !== 'development') {
    throw new Error('Unknown NODE_ENV')
  }
  let proxyOrigin = from.PROXY_ORIGIN
  if (!proxyOrigin && env === 'development') {
    proxyOrigin = '^http:\\/\\/(localhost|127\\.0\\.0\\.1|\\[::1\\]):\\d+$'
  }
  let webOrigin = new URL(from.WEB_ORIGIN ?? getDefaultWebOrigin(env)).origin
  if (from.ANALYTICS_TOKEN !== undefined && from.ANALYTICS_TOKEN.length < 32) {
    throw new Error('ANALYTICS_TOKEN must have at least 32 symbols')
  }
  return {
    analyticsIps: (from.ANALYTICS_IPS ?? '')
      .split(',')
      .map(i => i.trim())
      .filter(i => i !== ''),
    analyticsToken: from.ANALYTICS_TOKEN,
    db: from.DATABASE_URL ?? getDefaultDatabase(env),
    dbCa: from.DATABASE_CA,
    debug: !!from.DEBUG,
    env,
    proxyMaxMediaSize: from.PROXY_MAX_MEDIA_SIZE
      ? Number(from.PROXY_MAX_MEDIA_SIZE) * 1024 * 1024
      : DEFAULT_PROXY_CONFIG.maxMediaSize,
    proxyOrigin,
    staging: !!from.STAGING,
    webOrigin
  }
}

export const config = getConfig(process.env)
