import { count } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const aboutMessages = i18n('about', {
  checkUpdates: 'Check updates',
  debugInfo: 'Debug info',
  experimentEnabled: 'Enabled',
  experimentRecords: 'Collected records',
  experimentRecordsCount: count({
    many: '{count} records',
    one: '{count} record'
  }),
  experiments: 'Experiments',
  experimentsDescription:
    'Ways to help developers: debug data collectors for bug hunts and, now and then, previews of unfinished features.',
  experimentSending: 'Sending',
  install: 'Install app to home screen',
  latest: 'Latest. What’s new',
  offline: 'Offline',
  opensource:
    '**Open source**. Anyone, even LLMs, can see how the app works and verify our promises.',
  pageTitle: 'About',
  reportIssue: 'Report an issue',
  source: 'Source',
  update: 'Update app',
  verification: 'Verification',
  version: 'App version'
})
