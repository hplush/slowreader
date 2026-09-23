import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const authMessages = i18n('auth', {
  askSaveAgain: 'Show save-password popup',
  createEmpty: 'Or create your empty account:',
  createAccount: 'Cloud',
  demo: 'See demo',
  email: params(
    '// Send this email to yourself\n// If you forget your password, you can search for it later here\n\nUser ID: {user}\nSecret: {secret}'
  ),
  exit: 'Log out',
  localDescription1:
    'Slow Reader works right on your device. No account needed.',
  localDescription2: 'You can create an account later to sync across devices.',
  login: 'Log in',
  newUser: 'Get started locally',
  noRecoveryDesc:
    'Slow Reader uses end-to-end encryption. If you lose your password, no one will be able to decrypt your data.',
  noRecoveryTitle: 'No password recovery',
  oldUser: 'Sign in to your account',
  payWarning:
    'After the beta, sync will need a small monthly fee. Self-hosting stays free.',
  privacyNote: 'Your data is encrypted. We can’t read it or track you.',
  privacyPolicy: 'Privacy Policy',
  randomNote: 'Your ID is random, so no one can link the account to you.',
  regenerateCredentials: 'Regenerate credentials',
  relogin: 'Log in again',
  reloginForm: 'Re-enter your credentials',
  reloginTitle: 'Re-login',
  savedPromise: 'I’ve saved my User ID and Secret',
  savePassword: 'Save your password',
  secret: 'Secret',
  signingIn: 'Signing in…',
  signingUp: 'Creating account…',
  signup: 'Create account on the server',
  signupTitle: 'Sign up',
  startLocal: 'Local',
  startTitle: 'Start',
  toEmail: 'Email password to myself',
  signUpUserId: 'Anonymous User ID',
  userId: 'User ID',
  userIdTaken: 'This User ID is already taken',
  wrongCredentials: 'Your session was removed from the server'
})
