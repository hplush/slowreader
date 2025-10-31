import { i18n } from '../../i18n.ts'

export const addMessages = i18n('add', {
  invalidUrl: 'There seems to be a mistake in the URL. Please check it.',
  noResults:
    'No feeds were found on this website.\n\n' +
    'Please check the URL or [open an issue] if it looks correct.',
  searchGuide:
    'Currently, Slow Reader supports RSS.\n\n' +
    'More sources are coming soon, but you can already use RSS wrappers for them.',
  title: 'Add',
  unloadable: 'Can’t open this website',
  urlLabel: 'Web page URL or social media handle'
})
