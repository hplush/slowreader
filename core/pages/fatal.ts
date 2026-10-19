import { computed } from 'nanostores'

import { resetDatabase } from '../client.ts'
import { type Fatal, fatal } from '../errors.ts'
import { createPage, routeParam } from './common.ts'

export const fatalPage = createPage('fatal', () => {
  let $name = routeParam('fatal', 'reason')
  let $reason = computed([fatal, $name], (error, name): Fatal => {
    if (error) return error
    if (
      name === 'brokenDatabase' ||
      name === 'crash' ||
      name === 'noDb' ||
      name === 'rejected'
    ) {
      return { error: 'Test page', type: name }
    }
    return { type: name ?? 'notFound' }
  })

  return {
    exit() {},
    hideMenu: computed($reason, reason => reason.type !== 'notFound'),
    params: { reason: $name },
    reason: $reason,
    resetDatabase() {
      return resetDatabase('rejected-action')
    }
  }
})

export type FatalPage = ReturnType<typeof fatalPage>
