export type Config = {
  assets: boolean
  db: string
  env: 'development' | 'production' | 'test'
  proxyOrigin: string | undefined
  staging: boolean
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

export function getConfig(from: Record<string, string | undefined>): Config {
  let env = from.NODE_ENV ?? 'development'
  if (env !== 'test' && env !== 'production' && env !== 'development') {
    throw new Error('Unknown NODE_ENV')
  }
  let proxyOrigin = from.PROXY_ORIGIN
  if (!proxyOrigin && env === 'development') {
    proxyOrigin = '^http:\\/\\/localhost:5173$'
  }
  return {
    assets: !!from.ASSETS,
    db: from.DATABASE_URL ?? getDefaultDatabase(env),
    env,
    proxyOrigin,
    staging: !!from.STAGING
  }
}

export const config = getConfig(process.env)
