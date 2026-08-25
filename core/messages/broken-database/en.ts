import { i18n } from '../../i18n.ts'

export const brokenDatabaseMessages = i18n('brokenDatabase', {
  cleanButton: 'Delete local data',
  description:
    'The app tried to download the data again, but the local database ' +
    'is still broken. Deleting the local data is the last thing, ' +
    'which can help.',
  error: 'Send this error to the developers',
  pageTitle: 'Local database is broken'
})
