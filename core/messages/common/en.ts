import { i18n } from '../../i18n.ts'

export const commonMessages = i18n('common', {
  brokenCategory: 'Broken category',
  empty: 'The value is required',
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
  openPost: 'Open post'
})
