import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const refreshMessages = i18n('refresh', {
  checked: params('Checked for new posts: {all}'),
  count: params('Checking for new posts: {done}/{all}'),
  errors: 'Errors',
  fastPosts: 'Fun',
  postsLoaded: 'New posts found',
  slowPosts: 'Useful',
  start: 'Check for new posts',
  stop: 'Stop updating'
})
