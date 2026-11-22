import { count, params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const organizeMessages = i18n('organize', {
  abandoned: 'Feed seems abandoned',
  account: 'Account',
  accountReading: 'Account',
  anonymous: 'Anonymous',
  categoriesTitle: 'Categories',
  delete: 'Delete',
  deleteCategory: 'Delete category',
  deleteCategoryConform:
    'All feeds in this category will be moved to General. Are you sure you want to continue?',
  deleteConform:
    'This will permanently delete the feed, including its statistics and posts. Are you sure?',
  dislikedPosts: 'Disliked',
  deleteFinalConform:
    'This will delete the feed and leave the private channel. You can return only by an invite. Are you sure?',
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
  feedsCount: count({
    many: '{count} feeds',
    one: '{count} feed'
  }),
  feedsTitle: 'Feeds',
  feedUrl: 'Feed URL',
  lastPost: params('Last post {time}'),
  likedPosts: 'Liked',
  follow: 'Follow',
  morePosts: 'More posts',
  noDislikedPosts: 'No dislikes',
  noLikedPosts: 'No likes',
  openWebsite: 'Open website',
  postsList: 'Posts list',
  recentPosts: 'Recent',
  rename: 'Rename',
  renameCategory: 'Rename category',
  sameAsAccount: 'Same as account',
  slow: 'Useful',
  stats: 'Last 90 days',
  statsDisliked: params('{count} disliked'),
  statsLiked: params('{count} liked'),
  statsOpened: params('{count} opened'),
  statsOther: params('{count} only seen'),
  statsSeen: count({
    many: '{count} posts seen',
    one: '{count} post seen'
  }),
  syncingFollows: 'Loading your follows…',
  title: 'Feed name',
  tooFrequent: 'Feed posts too often',
  type: 'Feed type',
  unfollow: 'Unfollow'
})
