import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const refreshMessages = i18n('refresh', {
  checked: params('Checked for new posts: {all}'),
  count: params('Checking for new posts: {done}/{all}'),
  deadFeeds:
    'Many feeds are deleted or abandoned. Unfollow them for faster feeds update.',
  errors: 'Errors',
  extension:
    'The extension may fix it by loading feeds privately from your browser.',
  initializingFeeds: 'Preparing feeds…',
  initializingFollows: 'Loading your follows…',
  initializingLock: 'Asking other devices to wait…',
  initializingSync: 'Syncing with other devices…',
  other: 'Another device is checking for new posts',
  media: params('Saving media: {done}/{all}'),
  mediaDone: params('Saved media: {done}'),
  mediaWaiting: 'Media will be saved after posts update',
  postsLoaded: 'New posts found',
  start: 'Check for new posts',
  stop: 'Stop updating'
})
