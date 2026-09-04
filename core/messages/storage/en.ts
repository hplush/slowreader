import { i18n } from '../../i18n.ts'

export const storageMessages = i18n('storage', {
  compact: 'Compact database',
  compacting: 'Compacting the database',
  dangerousTitle: 'Dangerous action',
  deleteData: 'Delete all local data',
  deleteWarning:
    'This action cannot be undone. Are you sure you want to delete your data?',
  deletingDemo: 'Deleting the demo feeds',
  demoDrop: 'Delete',
  demoKeep: 'Keep as mine',
  demoTitle: 'You are in the demo mode',
  demoDesc: 'Choose what to do with the demo feeds:',
  pageTitle: 'Storage',
  rebuild: 'Rebuild database from the cloud',
  rebuildWarning: 'The app will be blocked for a while. Continue?',
  size: 'Database size',
  sizeLoading: 'Calculating…'
})
