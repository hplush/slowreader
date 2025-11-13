import { atom } from 'nanostores'

import { createReader } from './common.ts'

export const onboardingReader = createReader('onboarding', ({ reading }) => {
  return {
    exit() {},
    loading: atom(false),
    reading
  }
})

export type OnboardingReader = NonNullable<ReturnType<typeof onboardingReader>>
