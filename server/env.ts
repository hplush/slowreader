export type Environment =
  | {
      DATABASE_URL: string
      NODE_ENV: 'production'
    }
  | {
      DATABASE_URL: undefined
      NODE_ENV: 'test' | undefined
    }

function getEnv(): Environment {
  if (process.env.NODE_ENV === 'production') {
    if (typeof process.env.DATABASE_URL === 'undefined') {
      throw new Error('Set DATABASE_URL with PostgreSQL credentials')
    }
    return {
      DATABASE_URL: process.env.DATABASE_URL,
      NODE_ENV: process.env.NODE_ENV
    }
  } else {
    return {
      DATABASE_URL: undefined,
      NODE_ENV: process.env.NODE_ENV as 'test' | undefined
    }
  }
}

export const env = getEnv()
