export type Environment = {
  ASSETS_DIR?: string
  DATABASE_URL: string | undefined
  NODE_ENV: 'production' | 'test' | undefined
}

export function getEnv(from: Record<string, string | undefined>): Environment {
  if (from.NODE_ENV === 'production') {
    if (typeof from.DATABASE_URL === 'undefined') {
      throw new Error('Set DATABASE_URL with PostgreSQL credentials')
    }
    return {
      ASSETS_DIR: from.ASSETS_DIR,
      DATABASE_URL: from.DATABASE_URL,
      NODE_ENV: from.NODE_ENV
    }
  } else {
    return {
      ASSETS_DIR: from.ASSETS_DIR,
      DATABASE_URL: from.DATABASE_URL,
      NODE_ENV: from.NODE_ENV as 'test' | undefined
    }
  }
}

export const env = getEnv(process.env)
