export type Environment = {
  DATABASE_URL: string | undefined
  NODE_ENV: 'development' | 'production' | 'test'
} & (
  | {
      ASSETS_DIR: string
      ROUTES_FILE: string
    }
  | { ASSETS_DIR: undefined; ROUTES_FILE: undefined }
)

export function getEnv(from: Record<string, string | undefined>): Environment {
  let NODE_ENV = from.NODE_ENV ?? 'development'
  if (
    NODE_ENV !== 'test' &&
    NODE_ENV !== 'production' &&
    NODE_ENV !== 'development'
  ) {
    throw new Error('Unknown NODE_ENV')
  }
  if (
    (from.ASSETS_DIR && !from.ROUTES_FILE) ||
    (!from.ASSETS_DIR && from.ROUTES_FILE)
  ) {
    throw new Error('ASSETS_DIR and ROUTES_FILE must be set together')
  }
  if (NODE_ENV === 'production' && !from.DATABASE_URL) {
    throw new Error('Set DATABASE_URL with PostgreSQL credentials')
  }
  return {
    ASSETS_DIR: from.ASSETS_DIR,
    DATABASE_URL: from.DATABASE_URL,
    NODE_ENV,
    ROUTES_FILE: from.ROUTES_FILE
  } as Environment
}

export const env = getEnv(process.env)
