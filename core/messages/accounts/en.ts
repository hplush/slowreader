import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const accountsMessages = i18n('accounts', {
  addBluesky: 'Add Bluesky',
  addMastodon: 'Add Mastodon',
  addTelegram: 'Add Telegram',
  addTitle: 'Add account',
  authorizing: 'Signing in…',
  blueskyTitle: 'Bluesky sign in',
  cancel: 'Cancel',
  codeField: 'Telegram login code',
  codeFromApp: 'Code from Telegram app',
  codeFromCall: 'Code from phone call',
  codeFromFragment: 'Code from fragment.com',
  codeFromSms: 'Code from SMS',
  deleteAccount: 'Delete account',
  deleteConfirm: 'Delete this account from Slow Reader?',
  deleting: 'Deleting account…',
  deviceSignInNote:
    'Signed in on another device. Here you only read synced posts.',
  emailCodeField: 'Code from email',
  expiredCode: 'The code expired. Cancel and sign in again.',
  feedsType: 'Type of feeds',
  follow: 'Use for new subscriptions',
  followNote: 'Follow authors on the service by this account',
  handle: 'Handle',
  handleField: 'Your handle',
  invalidCode: 'Wrong code',
  invalidHandle: 'Enter a handle like @user.bsky.social',
  invalidPassword: 'Wrong password',
  invalidPhone: 'Enter a phone number with country code like +1 (212) 555-0123',
  invalidServer: 'Enter a server like mastodon.social',
  mastodonTitle: 'Mastodon sign in',
  name: 'Name',
  noAccounts:
    'Add your social media accounts to read their feed in Slow Reader',
  notSignedInHere: 'Not signed in on this device',
  oldMastodon:
    'Your server runs Mastodon older than 4.3. Ask its admin to update it.',
  pageTitle: 'Accounts',
  passwordField: 'Two-step verification password',
  phoneField: 'Your phone number',
  safeDesc: params(
    'Our server can’t use your {service} account. We’re open source, so anyone can check.'
  ),
  safeTitle: 'Your sign-in stays on your devices',
  scanCode: 'QR code to sign in',
  sendCode: 'Send code',
  sendingCode: 'Sending code…',
  serverField: 'Server or your handle',
  signIn: 'Sign in',
  signInAgain: 'Sign in again',
  signInExpired: 'Sign in expired',
  signInFailed: 'The service did not accept the sign in. Try again.',
  signInOnDevice: 'Sign in on this device',
  telegramJoinFailed:
    'Telegram asks for more steps to join this channel. Join it in the official Telegram app, and it will appear here.',
  telegramOfficialApp:
    'Finish this step in the official Telegram app, then sign in here again',
  telegramOnlyChannels:
    'Slow Reader supports only Telegram channels, not users, bots, or groups',
  telegramScan: 'Scan in Telegram on your phone:',
  telegramScanPath: 'Settings → Devices → Link Desktop Device',
  telegramTitle: 'Telegram sign in',
  tooManyAttempts:
    'Too many attempts. Telegram asks to wait before the next one.',
  unknownHandle: 'Can’t find this handle',
  useForm: 'Sign-in by code instead',
  useScan: 'Sign in by QR code'
})
