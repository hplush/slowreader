import { atom, computed } from 'nanostores'

import { type Fatal, fatal } from '../errors.ts'
import { createPage } from './common.ts'

export const fatalPage = createPage('fatal', () => {
  let $reason = atom<Fatal['type'] | undefined>()

  return {
    exit() {},
    params: { reason: $reason },
    // The route without the reason is opened by the unknown URL too
    reason: computed([fatal, $reason], (error, name): Fatal => {
      if (error) {
        return error
      } else if (name === 'brokenDatabase') {
        return { error: undefined, type: 'brokenDatabase' }
      } else if (name === 'outdated') {
        return { type: 'outdated' }
      } else {
        return { type: 'notFound' }
      }
    })
  }
})

export type FatalPage = ReturnType<typeof fatalPage>
