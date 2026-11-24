import { isObject } from '../loader/common.ts'
import { sendToTelegram, traceTelegram } from '../loader/telegram.ts'
import type { Experiment } from './common.ts'

function setOnline(session: string, value: boolean): void {
  sendToTelegram(session, {
    '@type': 'setOption',
    'name': 'online',
    'value': { '@type': 'optionValueBoolean', value }
  }).catch(() => {})
}

export const online: Experiment = {
  autostart: false,
  collects: false,
  description:
    'Tells Telegram that you are online while the app uses it, to check ' +
    'if images load faster this way. People, who can see your last seen ' +
    'time, will see you online.',
  hidden: false,
  name: 'online',
  onStart() {
    let sessions = new Set<string>()
    let untrace = traceTelegram(event => {
      if (event.type !== 'update') return
      let state =
        event.update['@type'] === 'updateAuthorizationState' &&
        isObject(event.update.authorization_state)
          ? event.update.authorization_state['@type']
          : undefined
      if (state === 'authorizationStateReady') {
        sessions.add(event.session)
        setOnline(event.session, true)
      } else if (state) {
        // TDLib forgets the option on every restart
        sessions.delete(event.session)
      } else if (!sessions.has(event.session)) {
        // TDLib was already started, when user enabled the experiment
        sessions.add(event.session)
        setOnline(event.session, true)
      }
    })
    return () => {
      untrace()
      for (let session of sessions) setOnline(session, false)
    }
  },
  sending: false,
  title: 'Telegram online'
}
