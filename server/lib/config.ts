import { DEFAULT_PROXY_CONFIG } from '@slowreader/proxy'

export type Config = {
  db: string
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
    return 'file://./db/pgdata'
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
  return {
    db: from.DATABASE_URL ?? getDefaultDatabase(env),
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
