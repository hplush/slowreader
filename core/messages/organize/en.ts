import { count } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const organizeMessages = i18n('organize', {
  account: 'Account',
  accountReading: 'Account’s',
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
  perDay: count({
    many: '{count} posts per day',
    one: '{count} post per day'
  }),
  perMonth: count({
    many: '{count} posts per month',
    one: '{count} post per month'
  }),
  perWeek: count({
    many: '{count} posts per week',
    one: '{count} post per week'
  }),
  perYear: count({
    many: '{count} posts per year',
    one: '{count} post per year'
  }),
  feedPosts: 'Recent posts',
  feedsTitle: 'Feeds',
  feedUrl: 'Feed URL',
  morePosts: 'More posts',
  openWebsite: 'Open website',
  renameCategory: 'Rename category',
  sameAsAccount: 'Same as account',
  slow: 'Useful',
  syncingFollows: 'Loading your follows…',
  title: 'Feed name',
  tooFrequent: 'Feed posts too often',
  type: 'Feed type'
})
