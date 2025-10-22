import { i18n } from '../../i18n.ts'

export const addMessages = i18n('add', {
  add: 'Subscribe to feed',
  edit: 'Edit',
  invalidUrl: 'URL has an mistake, please check it',
  noResults:
    'Feeds were not found on this website.\n\n' +
    'Please check URL and [open an issue] if it’s correct.',
  search: 'Search for feed',
  searchGuide:
    'For now we support RSS and Mastodon.\n\n' +
    'More sources are coming, but you can use RSS wrappers for them.',
  title: 'Add',
  unloadable: 'Can’t open this website',
  urlLabel: 'Web page URL or social account handle'
})
