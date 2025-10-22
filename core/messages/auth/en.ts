import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const authMessages = i18n('auth', {
  askSaveAgain: 'Show save-password popup',
  createAccount: 'Create cross-device account',
  customServer: 'Use my own server',
  email: params(
    '// Send this email to yourself\n// If you forget your password, you can search for it later here\n\nUser ID: {user}\nSecret: {secret}'
  ),
  localDescription1: 'Slow Reader works right on your device — no account needed.',
  localDescription2:
    'You can create an account later to sync across devices.',
  login: 'Log in',
  newUser: 'Get started locally',
  noRecoveryDesc:
    'Slow Reader uses end-to-end encryption. If you lose your password, no one will be able to decrypt your data.',
  noRecoveryTitle: 'No password recovery',
  oldUser: 'Sign in to your account',
  payWarning:
    'After the beta, a small monthly subscription will support server development. Self-hosted use will stay free.',
  randomNote:
    'A random user ID is used for privacy. It makes it harder to link your account to your identity.',
  regenerateCredentials: 'Regenerate credentials',
  savedPromise: 'I’ve saved my User ID and Secret',
  savePassword: 'Save your password',
  secret: 'Secret',
  server: 'Custom server',
  signingIn: 'Signing in…',
  signingUp: 'Creating account…',
  signup: 'Create account on the server',
  signupTitle: 'Sign up',
  start: 'Start local app',
  startTitle: 'Start',
  title: 'No account in this browser yet',
  toEmail: 'Email password to myself',
  userId: 'User ID',
  userIdTaken: 'This User ID is already taken'
})
