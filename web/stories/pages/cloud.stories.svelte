<script context="module" lang="ts">
  import {
    cloudMessages,
    type CloudPage,
    hasCloud,
    isDemo,
    pages,
    type PasskeyItem,
    passkeyOnly,
    type SessionItem,
    syncStatus
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import CloudPageComponent from '../../pages/cloud.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: CloudPageComponent,
    title: 'Pages/Cloud'
  })

  function passkey(
    name: string,
    provider: null | string,
    synced: boolean
  ): PasskeyItem {
    return {
      createdAt: new Date('2026-08-01T10:00:00Z'),
      id: name,
      lockedKey: '',
      name,
      provider,
      synced,
      usedAt: new Date('2026-09-20T10:00:00Z')
    }
  }

  const PASSKEYS = [
    passkey('Apple Passwords', 'Apple Passwords', true),
    passkey('YubiKey', 'YubiKey 5 Series', false),
    passkey(
      'alexander.hamilton-personal-yubikey-5c-nfc-backup-kept-in-home-office-drawer',
      'YubiKey 5 Series',
      false
    ),
    passkey('Work laptop', 'Google Password Manager', true)
  ]

  function session(
    id: string,
    method: SessionItem['method'],
    online: boolean,
    current = false
  ): SessionItem {
    let [browser = '', os = ''] = id.split('|')
    return {
      browser,
      createdAt: new Date('2026-08-01T10:00:00Z'),
      current,
      id,
      method,
      name: browser ? `${browser} on ${os}` : 'Unknown device',
      online,
      os,
      usedAt: new Date('2026-09-20T10:00:00Z')
    }
  }

  const SESSIONS = [
    session('Firefox|Linux', { type: 'password' }, true, true),
    session('Safari|iOS', { name: 'Apple Passwords', type: 'passkey' }, true),
    session('Chrome|Windows', { name: 'YubiKey', type: 'passkey' }, false),
    session('|', { type: 'deleted' }, false)
  ]

  function withLists(
    passkeys: PasskeyItem[] | undefined,
    sessions: SessionItem[] | undefined
  ): CloudPage {
    return {
      ...pages.cloud(),
      passkeys: atom(
        passkeys ? { status: 'ready', value: passkeys } : { status: 'loading' }
      ),
      sessions: atom(
        sessions ? { status: 'ready', value: sessions } : { status: 'loading' }
      ),
      suggestSecondPasskey: atom(passkeys?.length === 1 && !passkeys[0]!.synced)
    }
  }
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="cloud">
    <CloudPageComponent page={withLists(PASSKEYS, SESSIONS)} />
  </Scene>
</Story>

<Story name="Loading" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="cloud">
    <CloudPageComponent page={withLists(undefined, undefined)} />
  </Scene>
</Story>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="cloud">
    <CloudPageComponent page={withLists([], [SESSIONS[0]!])} />
  </Scene>
</Story>

<Story name="Only Device Passkey" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene passkeys={false} route="cloud">
    <CloudPageComponent
      page={withLists([passkey('Passkey', null, false)], SESSIONS)}
    />
  </Scene>
</Story>

<Story name="Reauth" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.cloud().reauth.set({ passwordOnly: false, type: 'addPasskey' })
    }}
    route="cloud"
  >
    <CloudPageComponent page={withLists(PASSKEYS, SESSIONS)} />
  </Scene>
</Story>

<Story name="No Password" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      passkeyOnly.set(true)
    }}
    route="cloud"
  >
    <CloudPageComponent page={withLists(PASSKEYS, SESSIONS)} />
  </Scene>
</Story>

<Story
  name="No Password Last Passkey"
  asChild
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      passkeyOnly.set(true)
      pages.cloud().reauth.set({
        passkeyId: 'Apple Passwords',
        passwordOnly: true,
        type: 'deletePasskey'
      })
    }}
    route="cloud"
  >
    <CloudPageComponent page={withLists([PASSKEYS[0]!], SESSIONS)} />
  </Scene>
</Story>

<Story name="Delete Last Passkey" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.cloud().reauth.set({
        passkeyId: 'Apple Passwords',
        passwordOnly: true,
        type: 'deletePasskey'
      })
      pages.cloud().reauthError.set(cloudMessages.get().wrongPassword)
    }}
    route="cloud"
  >
    <CloudPageComponent page={withLists([PASSKEYS[0]!], SESSIONS)} />
  </Scene>
</Story>

<Story name="New Password" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages
        .cloud()
        .newPassword.set(
          'PDn2M6eYaGPcG5eBC231rdJ8xJB34EryNVzP1xSjadrHbViwxHNeJ4CSEa5T18YhFT'
        )
    }}
    route="cloud"
  >
    <CloudPageComponent page={withLists(PASSKEYS, SESSIONS)} />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="cloud">
    <CloudPageComponent
      page={withLists(PASSKEYS, [
        ...SESSIONS,
        session(
          'Norton Private Browser|Chromecast SmartSpeaker',
          { type: 'password' },
          false
        )
      ])}
    />
  </Scene>
</Story>

<Story name="Local" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasCloud.set(false)
    }}
    route="cloud"
  >
    <CloudPageComponent page={pages.cloud()} />
  </Scene>
</Story>

<Story name="Unsaved" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('wait')
    }}
    route="cloud"
  >
    <CloudPageComponent page={withLists(PASSKEYS, SESSIONS)} />
  </Scene>
</Story>

<Story name="Demo" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasCloud.set(false)
      isDemo.set(true)
    }}
    route="cloud"
  >
    <CloudPageComponent page={pages.cloud()} />
  </Scene>
</Story>
