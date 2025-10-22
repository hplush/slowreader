import { i18n } from '../../i18n.ts'

export const addMessages = i18n('add', {
  add: 'Subscribe to feed',
  edit: 'Edit',
  invalidUrl: 'There seems to be a mistake in the URL. Please check it.',
  noResults:
    'No feeds were found on this website.\n\n' +
    'Please check the URL or [open an issue] if it looks correct.',
  searchGuide:
    'Currently, Slow Reader supports RSS and Mastodon.\n\n' +
    'Support for more sources is coming soon, but you can already use RSS wrappers for them.',
  title: 'Add feed',
  unloadable: 'Can’t open this website',
  urlLabel: 'Web page URL or social media handle'
})
