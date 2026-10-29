import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const organizeMessages = i18n('organize', {
  account: 'Account',
  addFeed: 'Subscribe',
  anonymous: 'Anonymous',
  byCategoryTitle: 'By category',
  deleteCategory: 'Delete category',
  deleteCategoryConform:
    'All feeds in this category will be moved to General. Are you sure you want to continue?',
  deleteConform:
    'This will permanently delete the feed, including its statistics and posts. Are you sure?',
  deleteFeed: 'Delete feed',
  fast: 'Fun',
  feedPosts: 'Recent posts',
  feedsTitle: 'Feeds',
  feedUrl: params('Feed URL ({type})'),
  morePosts: 'More posts',
  openWebsite: 'Open website',
  renameCategory: 'Rename category',
  slow: 'Useful',
  title: 'Feed name',
  type: 'Feed type'
})
