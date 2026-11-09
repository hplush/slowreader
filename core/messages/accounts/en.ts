import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const accountsMessages = i18n('accounts', {
  addBluesky: 'Add Bluesky',
  addMastodon: 'Add Mastodon',
  addTitle: 'Add account',
  authorizing: 'Signing in…',
  blueskyTitle: 'Bluesky sign in',
  cancel: 'Cancel',
  deleteAccount: 'Delete account',
  deleteConfirm: 'Delete this account from Slow Reader?',
  feedsType: 'Type of feeds',
  follow: 'Use for new subscriptions',
  followNote: 'Follow authors on the service by this account',
  handle: 'Handle',
  handleField: 'Your handle',
  invalidHandle: 'Enter a handle like @user.bsky.social',
  invalidServer: 'Enter a server like mastodon.social',
  mastodonTitle: 'Mastodon sign in',
  name: 'Name',
  noAccounts:
    'Add your social media accounts to read their feed in Slow Reader',
  oldMastodon:
    'Your server runs Mastodon older than 4.3. Ask its admin to update it.',
  pageTitle: 'Accounts',
  safeDesc: params(
    'Our server can’t use your {service} account. We’re open source, so anyone can check.'
  ),
  safeTitle: 'Your sign-in stays on your devices',
  serverField: 'Server or your handle',
  signIn: 'Sign in',
  signInAgain: 'Sign in again',
  signInExpired: 'Sign in expired',
  signInFailed: 'The service did not accept the sign in. Try again.',
  unknownHandle: 'Can’t find this handle'
})
