import { isEventName } from '@slowreader/api'

import { fatal } from '../errors.ts'
import { track } from '../events.ts'
import type { Experiment } from './common.ts'

export const errors: Experiment = {
  autostart: true,
  collects: false,
  description:
    'Sends anonymous counts of fatal errors to our server. Only with a cloud account.',
  hidden: false,
  name: 'errors',
  onStart() {
    return fatal.listen(value => {
      if (!value) return
      let name = `fatal-${value.type}`
      if (isEventName(name)) void track(name, { daily: true })
    })
  },
  sending: true,
  title: 'Send error counts'
}
