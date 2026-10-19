import { i18n } from '../../i18n.ts'

export const addMessages = i18n('add', {
  atomLoader: 'Atom',
  blueskyLoader: 'BlueSky',
  invalidUrl: 'There seems to be a mistake in the URL. Please check it.',
  jsonFeedLoader: 'JSON Feed',
  mastodonLoader: 'Mastodon',
  noResults:
    'No feeds were found on this website.\n\n' +
    'Please check the URL or [open an issue] if it looks correct.',
  rssLoader: 'RSS',
  searchGuide:
    'Currently, Slow Reader supports RSS, Mastodon, and BlueSky.\n\n' +
    'More sources are coming soon.',
  title: 'Add',
  unknownHandle: 'This user was not found on supported social networks.',
  unloadable: 'Can’t open this website',
  urlLabel: 'Web page URL or social media handle'
})
