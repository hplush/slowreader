import { i18n } from '../../i18n.ts'

export const fatalMessages = i18n('fatal', {
  brokenDatabaseDescription:
    'The app tried to download the data again, but the local database ' +
    'is still broken. Deleting the local data is the last thing, ' +
    'which can help.',
  brokenDatabaseTitle: 'Local database is broken',
  cleanButton: 'Delete local data',
  error: 'Send this error to the developers',
  home: 'Home',
  notFoundText: 'Page not found',
  notFoundTitle: '404',
  outdatedTitle: 'Your client is too old',
  updateButton: 'Update client now'
})
