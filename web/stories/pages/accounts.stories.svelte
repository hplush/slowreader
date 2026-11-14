<script context="module" lang="ts">
  import { accountsMessages, deviceSessions, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import AccountsPage from '../../pages/accounts.svelte'
  import avatarExample from '../assets/short_width_example.avif'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: AccountsPage,
    title: 'Pages/Accounts'
  })

  const ACCOUNTS = [
    {
      avatar: avatarExample,
      handle: '@sitnik@mastodon.social',
      title: 'Andrey Sitnik'
    },
    {
      expired: true,
      handle: '@sitnik.bsky.social',
      server: 'https://amanita.us-east.host.bsky.network',
      service: 'bluesky' as const,
      title: 'Andrey Sitnik'
    },
    {
      handle:
        '@alexander.hamilton.personal.account@very-long-server-name.example',
      title: 'Alexander Hamilton with a very long display name on Mastodon'
    },
    {
      credentials: null,
      handle: '@sitnik',
      id: 'telegram',
      server: 'https://t.me',
      service: 'telegram' as const,
      title: 'Andrey Sitnik'
    }
  ]
</script>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="accounts">
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    accounts={ACCOUNTS}
    oninit={() => {
      pages.accounts().telegram.set(true)
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story
  name="List Mobile Dark"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    accounts={ACCOUNTS.map(account => ({ ...account, expired: false }))}
    oninit={() => {
      deviceSessions.set({
        telegram: { device: 'device', service: 'telegram' }
      })
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story name="Mastodon Server" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.accounts().step.set({
        field: 'server',
        service: 'mastodon',
        type: 'form'
      })
      pages.accounts().input.set('mastodon.example')
      pages.accounts().error.set(accountsMessages.get().oldMastodon)
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story name="Bluesky Handle" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.accounts().step.set({
        field: 'handle',
        service: 'bluesky',
        type: 'form'
      })
      pages.accounts().input.set('@sitnik.bsky.social')
      pages.accounts().submitting.set(true)
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story name="Telegram Phone" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.accounts().step.set({
        field: 'phone',
        service: 'telegram',
        type: 'form'
      })
      pages.accounts().input.set('+1 (212) 555-0123')
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story name="Telegram QR Code" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.accounts().step.set({
        link: 'tg://login?token=AQJqKjRnh0bR6Z5kq1hPpQpEoQeTnYcVb3mM2sXw',
        service: 'telegram',
        type: 'scan'
      })
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story
  name="Telegram Code Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      pages.accounts().step.set({
        field: 'code',
        service: 'telegram',
        type: 'form'
      })
      pages.accounts().label.set(accountsMessages.get().codeFromApp)
      pages.accounts().input.set('12345')
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story
  name="Telegram Password Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      pages.accounts().step.set({
        field: 'password',
        service: 'telegram',
        type: 'form'
      })
      pages.accounts().input.set('password')
      pages.accounts().error.set(accountsMessages.get().invalidPassword)
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>
