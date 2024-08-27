export type Environment =
  | {
      DATABASE_URL: string
      NODE_ENV: 'production'
    }
  | {
      DATABASE_URL: undefined
      NODE_ENV: 'test' | undefined
    }

export function getEnv(from: Record<string, string | undefined>): Environment {
  if (from.NODE_ENV === 'production') {
    if (typeof from.DATABASE_URL === 'undefined') {
      throw new Error('Set DATABASE_URL with PostgreSQL credentials')
    }
    return {
      DATABASE_URL: from.DATABASE_URL,
      NODE_ENV: from.NODE_ENV
    }
  } else {
    return {
      DATABASE_URL: undefined,
      NODE_ENV: from.NODE_ENV as 'test' | undefined
    }
  }
}

export const env = getEnv(process.env)
