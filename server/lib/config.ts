export type Config = {
  assets: boolean
  behindBalancer: boolean
  db: string
  debug: boolean
  env: 'development' | 'production' | 'test'
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
    return 'http://localhost:2553'
  }
}

export function getConfig(from: Record<string, string | undefined>): Config {
  let env = from.NODE_ENV ?? 'development'
  if (env !== 'test' && env !== 'production' && env !== 'development') {
    throw new Error('Unknown NODE_ENV')
  }
  let proxyOrigin = from.PROXY_ORIGIN
  if (!proxyOrigin && env === 'development') {
    proxyOrigin = '^http:\\/\\/localhost:\\d+$'
  }
  let webOrigin = new URL(from.WEB_ORIGIN ?? getDefaultWebOrigin(env)).origin
  return {
    assets: !!from.ASSETS,
    behindBalancer: !!from.BEHIND_BALANCER,
    db: from.DATABASE_URL ?? getDefaultDatabase(env),
    debug: !!from.DEBUG,
    env,
    proxyOrigin,
    staging: !!from.STAGING,
    webOrigin
  }
}

export const config = getConfig(process.env)
