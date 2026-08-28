import { i18n } from '../../i18n.ts'

export const fatalMessages = i18n('fatal', {
  brokenDatabaseDescription:
    'The app tried to download the data again, but the local database ' +
    'is still broken. Deleting the local data is the last thing, ' +
    'which can help.',
  brokenDatabaseText: 'Local database is broken',
  brokenDatabaseTitle: 'Broken DB',
  cleanButton: 'Delete local data',
  error: 'Send this error to the developers',
  home: 'Home',
  notFoundText: 'Page not found',
  notFoundTitle: '404',
  outdatedText: 'Your client is too old',
  outdatedTitle: 'Outdated',
  updateButton: 'Update client now'
})
