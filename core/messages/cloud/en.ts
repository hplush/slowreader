import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const cloudMessages = i18n('cloud', {
  connectingAfterWaitStatus: 'Connecting… Unsaved changes.',
  connectingStatus: 'Connecting…',
  createAccount: 'Create cloud account',
  dangerousTitle: 'Dangerous action',
  deleteAccount: 'Delete your data from the cloud',
  deleteWarning:
    'This action cannot be undone. Are you sure you want to delete your data?',
  disconnectedStatus: 'Offline',
  errorStatus: params('Error: {details}'),
  exit: 'Sign out on this device',
  exitWaitSync: 'Delete unsaved data and sign out',
  noCloudDesc1:
    'You don’t have a cloud account. Your data is stored only on this device.',
  noCloudDesc2:
    'To use the same account on another device or back up your data, create a cloud account.',
  noCloudTitle: 'No cloud account',
  passkeyNoPrf:
    'Your passkey provider can’t protect encrypted data. Use another provider.',
  wrongPassword: 'Wrong password',
  wrongProof: 'Server did not accept the proof. Try again.',
  pageTitle: 'Profile',
  receivingStatus: 'Downloading…',
  sendingAfterWaitStatus: 'Connected. Sending unsaved changes…',
  sendingStatus: 'Connected. Requesting changes from the cloud…',
  stableServer: 'Stable server',
  stagingDesc:
    'This is a development preview server. Your data in the cloud can be lost here.',
  status: 'Sync status',
  synchronizedAfterWaitStatus: 'Online. All changes was synchronized.',
  synchronizedStatus: 'Online',
  userId: 'User ID',
  waitStatus: 'Offline. Unsaved changes.',
  wrongCredentialsStatus: 'Wrong credentials error',
  passkeysTitle: 'Passkeys',
  noPasskeys:
    'No passkeys. We recommend them, since they are safer than the password.',
  addPasskey: 'Add passkey',
  cancel: 'Cancel',
  passkeyName: 'Passkey name',
  delete: 'Delete',
  created: 'Created',
  used: 'Last used',
  passkeyType: 'Type',
  deviceBound: 'Device-bound',
  synced: 'Synced',
  provider: 'Provider',
  secondPasskeyTitle: 'Add a passkey on another device',
  secondPasskeyDesc:
    'Your only passkey works on one device. If you lose it, you will need the password.',
  passwordTitle: 'Password',
  generateNewPassword: 'Generate new password',
  createPassword: 'Create backup password',
  passkeyOnlyDesc:
    'You sign in only with passkeys. A backup password helps if you lose access to all of them.',
  firstPasswordDesc: 'All other devices were signed out.',
  newPasswordDesc:
    'Old password stopped working. All other devices were signed out.',
  sessionsTitle: 'Devices',
  device: params('{browser} on {os}'),
  unknownDevice: 'Unknown device',
  signInMethod: 'Signed in with',
  byPassword: 'Password',
  byDeletedPasskey: 'Deleted passkey',
  sessionStatus: 'Status',
  thisDevice: 'This device',
  online: 'Online',
  signOutSession: 'Sign out',
  signOutOthers: 'Sign out from all other devices',
  reauthAddPasskey: 'Confirm adding passkey',
  reauthDeletePasskey: 'Confirm passkey deletion',
  reauthNewPassword: 'Confirm password change',
  reauthDesc: 'Confirm that it is you with the current password or a passkey.',
  reauthByPasskeyDesc: 'Confirm that it is you with a passkey.',
  reauthCreatePassword: 'Confirm password creation',
  createPasswordFirst:
    'Without passkeys, you can sign in only with a password. Create a backup password first.',
  lastPasskeyDesc:
    'Without passkeys, you can sign in only with the password. Enter it to be sure you remember it.',
  lostPassword: 'Lost the password? Generate a new one with a passkey first.',
  confirmByPassword: 'Confirm with password',
  confirmByPasskey: 'Confirm with passkey',
  confirming: 'Confirming…'
})
