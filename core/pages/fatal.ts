import { atom, computed } from 'nanostores'

import { resetDatabase } from '../client.ts'
import { type Fatal, fatal } from '../errors.ts'
import { createPage } from './common.ts'

export const fatalPage = createPage('fatal', () => {
  let $reason = atom<Fatal['type'] | undefined>()

  return {
    exit() {},
    params: { reason: $reason },
    reason: computed([fatal, $reason], (error, name): Fatal => {
      if (error) return error
      if (name === 'brokenDatabase' || name === 'rejected') {
        return { error: 'Test page', type: name }
      }
      return { type: name ?? 'notFound' }
    }),
    resetDatabase() {
      return resetDatabase('rejected-action')
    }
  }
})

export type FatalPage = ReturnType<typeof fatalPage>
