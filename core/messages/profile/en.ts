import { i18n } from '../../i18n.ts'

export const profileMessages = i18n('profile', {
  createAccount: 'Create cloud account',
  dangerousTitle: 'Dangerous action',
  deleteAccount: 'Delete your data from the cloud',
  deleteWarning: 'This action cannot be undone. Are you sure you want to delete your data?',
  exit: 'Sign out on this device',
  exitNoCloud: 'Delete all local data',
  exitWaitSync: 'Delete unsaved data and sign out',
  noCloudDesc1:
    'You don’t have a cloud account. Your data is stored only on this device.',
  noCloudDesc2:
    'To use the same account on another device or back up your data, create a cloud account.',
  noCloudTitle: 'No cloud account',
  pageTitle: 'Profile',
  userId: 'User ID'
})
