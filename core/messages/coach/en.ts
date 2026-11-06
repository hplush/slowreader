import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const coachMessages = i18n('coach', {
  from: 'From',
  nightLock: 'Lock Fun at night',
  nightLockGroup: 'Night lock',
  nightLockNote: 'Solve a math task to open Fun',
  locked: params('Fun feed is locked until {time}'),
  pageTitle: 'Coach',
  showBalance: 'Show balance',
  showBalanceNote: 'Smile near Useful and Fun menu',
  settingsLocked: params('Solve a task to change settings until {time}'),
  to: 'To',
  unlock: 'Unlock',
  usageDayAgo: '24h ago',
  usageNow: 'now',
  usagePart: params('{type}, {duration}, {from}–{to}'),
  usagePartAt: params('{type}, {duration}, {time}'),
  usageSessions: '24h sessions',
  usageTitle: 'Reading statistics',
  wrong: 'Wrong answer. Try another task.'
})
