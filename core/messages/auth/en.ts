import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const authMessages = i18n('auth', {
  createEmpty: 'Or create your empty account:',
  createAccount: 'Cloud',
  demo: 'See demo',
  email: params(
    '// Send this email to yourself\n// If you forget your password, you can search for it later here\n\nUser ID: {user}\nPassword: {password}'
  ),
  exit: 'Log out',
  home: 'Home',
  localDescription1:
    'Slow Reader works right on your device. No account needed.',
  localDescription2: 'You can create an account later to sync across devices.',
  noRecoveryDesc:
    'Slow Reader uses end-to-end encryption. If you lose your password, no one will be able to decrypt your data.',
  noRecoveryTitle: 'No password recovery',
  oldUser: 'Sign in to your account',
  payWarning:
    'After the beta, sync will need a small monthly fee. Self-hosting stays free.',
  privacyNote: 'Your data is encrypted. We can’t read it or track you.',
  privacyPolicy: 'Privacy Policy',
  randomNote: 'Your ID is random, so no one can link the account to you.',
  regenerateCredentials: 'Regenerate User ID',
  relogin: 'Log in again',
  reloginForm: 'Re-enter your credentials',
  reloginTitle: 'Re-login',
  savedPromise: 'I’ve saved my password',
  addAnotherPasskey: 'I will add another passkey',
  savePassword: 'Save your password',
  saveBackupPassword: 'Save backup password',
  password: 'Password',
  signingIn: 'Signing in…',
  signingUp: 'Creating account…',
  signup: 'Create account',
  signupWithPasskey: 'Create account with passkey',
  signInWithPasskey: 'Sign in with passkey',
  signInWithPassword: 'Sign in with password',
  usePassword: 'Use password instead',
  usePasskey: 'Use passkey instead',
  generatedPassword: 'Generated password',
  passkeySaved: 'Passkey saved',
  passkeySavedIn: params('Passkey saved in {provider}'),
  passkeySavedDesc: 'Sign in with it on your devices.',
  deviceOnlyTitle: 'This passkey works only on this device',
  deviceOnlyDesc: 'Save the password or add a passkey on another device.',
  passkeyNoPrf:
    'This passkey can’t be used: your passkey provider can’t protect encrypted data. Use another provider or a password.',
  signupTitle: 'Sign up',
  startLocal: 'Local',
  startTitle: 'Start',
  toEmail: 'Email password to myself',
  signUpUserId: 'Anonymous User ID',
  userId: 'User ID',
  paperUser: 'User',
  invalidPasskey: 'Server did not accept the passkey. Try again.',
  userIdTaken: 'This User ID is already taken',
  wrongCredentials: 'Your session was removed from the server'
})
