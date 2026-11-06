import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const refreshMessages = i18n('refresh', {
  checked: params('Checked for new posts: {all}'),
  count: params('Checking for new posts: {done}/{all}'),
  errors: 'Errors',
  extension:
    'The extension may fix it by loading feeds privately from your browser.',
  media: params('Saving media for offline: {done}/{all}'),
  mediaDone: params('Saved media for offline: {done}'),
  postsLoaded: 'New posts found',
  start: 'Check for new posts',
  stop: 'Stop updating'
})
