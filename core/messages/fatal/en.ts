import { i18n } from '../../i18n.ts'

export const fatalMessages = i18n('fatal', {
  brokenDatabaseDescription:
    'The app tried to download the data again, but the local database ' +
    'is still broken. Deleting the local data is the last thing, ' +
    'which can help.',
  brokenDatabaseText: 'Local database is broken',
  brokenDatabaseTitle: 'Broken DB',
  cleanButton: 'Delete local data',
  downloadButton: 'Download data from the cloud',
  error: 'Send this error to the developers',
  home: 'Home',
  noDbDescription:
    'The browser refused to give the app a place on the disk, so ' +
    'the database does not work and nothing can be saved. It happens ' +
    'in private windows and in browsers without the required support.',
  noDbText: 'Browser can not save the data',
  noDbTitle: 'No DB',
  notFoundText: 'Page not found',
  notFoundTitle: '404',
  outdatedText: 'Your client is too old',
  outdatedTitle: 'Outdated',
  rejectedText: 'Cloud communication error',
  rejectedTitle: 'Rejected',
  updateButton: 'Update client now'
})
