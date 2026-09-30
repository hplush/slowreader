<script context="module" lang="ts">
  import type { PasskeyItem, PasskeyPopup } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import { atom } from 'nanostores'

  import PasskeyPopupComponent from '../../popups/passkey.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: PasskeyPopupComponent,
    title: 'Popups/Passkey'
  })

  function popup(passkey: PasskeyItem): PasskeyPopup {
    return {
      destroy() {},
      loading: atom(false),
      name: 'passkey',
      notFound: false,
      param: passkey.id,
      passkey: atom(passkey),
      remove() {},
      rename() {
        return Promise.resolve()
      },
      uniqueId: passkey.id
    }
  }

  const BASE = {
    createdAt: new Date('2026-08-01T10:00:00Z'),
    lockedKey: '',
    usedAt: new Date('2026-09-20T10:00:00Z')
  }
</script>

<Story name="Synced" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="cloud">
    <PasskeyPopupComponent
      popup={popup({
        ...BASE,
        id: 'apple',
        name: 'Apple Passwords',
        provider: 'Apple Passwords',
        synced: true
      })}
    />
  </Scene>
</Story>

<Story
  name="Device-Bound"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="cloud">
    <PasskeyPopupComponent
      popup={popup({
        ...BASE,
        id: 'yubikey',
        name: 'alexander.hamilton-personal-yubikey-5c-nfc-backup-kept-in-home-office-drawer',
        provider: 'YubiKey 5 Series',
        synced: false
      })}
    />
  </Scene>
</Story>

<Story name="Unknown Provider" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="cloud">
    <PasskeyPopupComponent
      popup={popup({
        ...BASE,
        id: 'passkey',
        name: 'Passkey',
        provider: null,
        synced: true
      })}
    />
  </Scene>
</Story>
