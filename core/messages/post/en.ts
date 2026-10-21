import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const postMessages = i18n('post', {
  afterFirst: params('{time} after'),
  hideWarning: 'Hide',
  quoteMissing: 'Quoted post is unavailable',
  quoteOfQuote: 'Quote…',
  read: 'Mark post was read',
  readCheckbox: 'Post was read',
  replyingTo: 'In reply to',
  rightAfter: 'Right after',
  repostedBy: params('Reposted by {name}'),
  showSensitive: 'Show sensitive media',
  showWarning: 'Show post',
  thread: params('1/{size}'),
  threadLabel: params('Thread of {size} posts'),
  unread: 'Mark post as unread',
  unsupported: 'Some parts of this post are not supported yet',
  url: 'Open post link'
})
