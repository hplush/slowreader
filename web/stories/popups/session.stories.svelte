<script context="module" lang="ts">
  import type { SessionItem, SessionPopup } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import SessionPopupComponent from '../../popups/session.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: SessionPopupComponent,
    title: 'Popups/Session'
  })

  function popup(session: Partial<SessionItem>): SessionPopup {
    return {
      destroy() {},
      loading: atom(false),
      name: 'session',
      notFound: false,
      param: 'session',
      session: atom({
        browser: 'Firefox',
        createdAt: new Date('2026-08-01T10:00:00Z'),
        current: false,
        id: 'session',
        method: { type: 'password' },
        name: 'Firefox on Linux',
        online: false,
        os: 'Linux',
        usedAt: new Date('2026-09-20T10:00:00Z'),
        ...session
      }),
      signOut() {
        return Promise.resolve()
      },
      uniqueId: 'session'
    }
  }
</script>

<Story name="Current" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="cloud">
    <SessionPopupComponent popup={popup({ current: true, online: true })} />
  </Scene>
</Story>

<Story name="Online by Passkey" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="cloud">
    <SessionPopupComponent
      popup={popup({
        method: {
          name: 'alexander.hamilton-personal-yubikey-5c-nfc-backup-kept-in-home-office-drawer',
          type: 'passkey'
        },
        name: 'Safari on iOS',
        online: true
      })}
    />
  </Scene>
</Story>

<Story
  name="Deleted Passkey"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="cloud">
    <SessionPopupComponent
      popup={popup({
        browser: 'Norton Private Browser',
        method: { type: 'deleted' },
        name: 'Norton Private Browser on Chromecast SmartSpeaker',
        os: 'Chromecast SmartSpeaker'
      })}
    />
  </Scene>
</Story>
