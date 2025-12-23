import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const commonMessages = i18n('common', {
  addCategory: 'Add category…',
  brokenCategory: 'Broken category',
  closePopup: 'Close popup',
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
  invalidSecret: 'Secret must contain two words of 10 characters each',
  invalidServer: 'This doesn’t look like a valid domain',
  invalidUrl: 'This doesn’t look like a valid web address',
  invalidUserId: 'User ID must contain 16 digits',
  loading: 'Loading…',
  networkError:
    'Can’t reach the server. Please check your internet connection.',
  parseError: 'Syntax error in the feed file',
  popupNotFound: 'Not found'
})
