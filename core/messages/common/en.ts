import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const commonMessages = i18n('common', {
  addCategory: 'Add category…',
  closePopup: 'Close popup',
  copied: 'Copied',
  copyToClipboard: 'Copy to clipboard',
  creatingDatabase: 'Creating local database',
  dontClose: 'Do not close the app until it is finished',
  downloadingData: 'Downloading your data from the cloud',
  empty: 'The value is required',
  error400: 'Bad request',
  error401: 'Unauthorized',
  error403: 'Forbidden',
  error404: 'Not Found',
  error451: 'Feed server blocked it by the law',
  error5xx: 'Feed server is not working',
  errorOther: params('Feed server error: {status}'),
  generalCategory: 'General',
  internalError: 'The app crashed. Please try again later while we fix it.',
  invalidCredentials: 'No user found with this credentials',
  invalidPassword: 'Password must contain 65 letters, digits, - or _',
  invalidUrl: 'This doesn’t look like a valid web address',
  invalidUserId: 'User ID must contain 16 digits',
  loading: 'Loading…',
  loadingData: 'Loading local data',
  migratingDatabase: 'Migrating local database',
  networkError:
    'Can’t reach the server. Please check your internet connection.',
  parseError: 'Syntax error in the feed file',
  passkeyExists:
    'Your passkey provider already has a passkey for this account. Use another provider or device.',
  passkeyNoPrf:
    'Your passkey provider can’t protect encrypted data. Sign in with password.',
  popupNotFound: 'Not found',
  signingOut: 'Signing out',
  tooManyRequests: 'Too many attempts. Please try again later.',
  unknownPasskey:
    'This passkey was deleted from your account. Sign in with password.',
  uploadingData: 'Uploading your data to the cloud',
  waitingConnection: 'Waiting for connection to download'
})
