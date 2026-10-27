import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const coachMessages = i18n('coach', {
  from: 'From',
  nightLock: 'Lock Fun at night',
  nightLockNote: 'Solve a math task to open Fun',
  locked: params('Fun feed is locked until {time}'),
  pageTitle: 'Coach',
  settingsLocked: params('Solve a task to change settings until {time}'),
  to: 'To',
  unlock: 'Unlock',
  wrong: 'Wrong answer. Try another task.'
})
