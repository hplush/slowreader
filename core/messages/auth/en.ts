import { params } from '@nanostores/i18n'

import { i18n } from '../../i18n.ts'

export const authMessages = i18n('auth', {
  askSaveAgain: 'Show save-password popup',
  createAccount: 'Create cross-device account',
  customServer: 'Use my own server',
  email: params(
    '// Send this email to yourself\n// If you will forget password, you will search by it here\n\nUser ID: {user}\nSecret: {secret}'
  ),
  localDescription1: 'Slow Reader works locally.',
  localDescription2:
    'You can create account later when you will need cross-device sync.',
  login: 'Login into existed account',
  newUser: 'New user',
  noRecoveryDesc:
    'The app uses end-to-end encryption. But if you will lose your password, nobody will be able to decrypt it.',
  noRecoveryTitle: 'We don’t have password recovery',
  oldUser: 'Existed user',
  payWarning:
    'After the beta we will fund development by small monthly subscription for using server. Self-hosted solution will be free.',
  randomNote:
    'We are using random user ID for privacy to make it harder to connect user with real person',
  regenerateCredetials: 'Re-generate',
  savedPromise: 'I saved user ID and secret',
  savePassword: 'Save your password',
  secret: 'Secret',
  server: 'Custom server',
  signingIn: 'Sending sign-in form',
  signingUp: 'Creating user',
  signup: 'Create user on the server',
  signupTitle: 'Sign Up',
  start: 'Start local app',
  startTitle: 'Start',
  title: 'No account in this browser yet',
  toEmail: 'Email password to myself',
  userId: 'User ID',
  userIdTaken: 'This user ID was taken'
})
