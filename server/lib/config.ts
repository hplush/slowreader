type AssetsPaths =
  | { assets: false; assetsDir: undefined; routes: undefined }
  | { assets: true; assetsDir: string; routes: string }

export type Config = {
  db: string
  env: 'development' | 'production' | 'test'
  proxyOrigin: string | undefined
  staging: boolean
} & AssetsPaths

function getDefaultDatabase(env: Config['env']): string {
  if (env === 'production') {
    throw new Error('Set DATABASE_URL with PostgreSQL credentials')
  } else if (env === 'test') {
    return 'memory://'
  } else {
    return 'file://./db/pgdata'
  }
}

function getPaths(from: Record<string, string | undefined>): AssetsPaths {
  if (from.ASSETS) {
    if (from.ASSETS_DIR && from.ROUTES_FILE) {
      return {
        assets: true,
        assetsDir: from.ASSETS_DIR,
        routes: from.ROUTES_FILE
      }
    } else {
      throw new Error('ASSETS, ASSETS_DIR and ROUTES_FILE must be set together')
    }
  } else {
    return { assets: false, assetsDir: undefined, routes: undefined }
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
    db: from.DATABASE_URL ?? getDefaultDatabase(env),
    env,
    proxyOrigin,
    staging: !!from.STAGING,
    ...getPaths(from)
  }
}

export const config = getConfig(process.env)
