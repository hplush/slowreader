import { atom } from 'nanostores'

import { createReader } from './common.ts'

export const welcomeReader = createReader('welcome', ({ reading }) => {
  return {
    exit() {},
    loading: atom(false),
    reading
  }
})

export type WelcomeReader = NonNullable<ReturnType<typeof welcomeReader>>
