import { i18n } from '../../i18n.ts'

export const storageMessages = i18n('storage', {
  dangerousTitle: 'Dangerous action',
  deleteData: 'Delete all local data',
  deleteWarning:
    'This action cannot be undone. Are you sure you want to delete your data?',
  pageTitle: 'Storage',
  rebuild: 'Rebuild database from the cloud',
  rebuildWarning: 'The app will be blocked for a while. Continue?',
  size: 'Database size',
  sizeLoading: 'Calculating…'
})
