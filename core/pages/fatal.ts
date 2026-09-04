import { atom, computed } from 'nanostores'

import { resetDatabase } from '../client.ts'
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
        return { error: 'Test page', type: 'brokenDatabase' }
      } else if (name === 'outdated') {
        return { type: 'outdated' }
      } else if (name === 'rejected') {
        return { error: 'Test page', type: 'rejected' }
      } else {
        return { type: 'notFound' }
      }
    }),
    resetDatabase() {
      return resetDatabase('rejected-action')
    }
  }
})

export type FatalPage = ReturnType<typeof fatalPage>
