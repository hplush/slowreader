import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const coachMessages = i18n('coach', {
  from: 'From',
  nightLock: 'Lock Fun at night',
  nightLockNote:
    'Keeps late-night Fun scrolling from eating your sleep. ' +
    'Solve a math task if you need to open Fun.',
  locked: params('Fun feed is locked until {time}'),
  pageTitle: 'Coach',
  remindUseful: 'Remind about Useful',
  remindUsefulNote:
    'Helps you not get stuck in Fun when you have time for long Useful posts.',
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
  usageNote:
    'When you see how you spend your reading time, it is easier to change your habits.',
  usageTitle: 'Reading statistics',
  wrong: 'Wrong answer. Try another task.'
})
