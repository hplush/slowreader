<script context="module" lang="ts">
  import { accountsMessages, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import AccountsPage from '../../pages/accounts.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: AccountsPage,
    title: 'Pages/Accounts'
  })

  const ACCOUNTS = [
    { handle: '@sitnik@mastodon.social', title: 'Andrey Sitnik' },
    {
      handle: '@sitnik.bsky.social',
      server: 'https://amanita.us-east.host.bsky.network',
      service: 'bluesky' as const,
      title: 'Andrey Sitnik'
    },
    {
      handle:
        '@alexander.hamilton.personal.account@very-long-server-name.example',
      title: 'Alexander Hamilton with a very long display name on Mastodon'
    }
  ]
</script>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="accounts">
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene accounts={ACCOUNTS} route="accounts">
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story
  name="List Mobile Dark"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene accounts={ACCOUNTS} route="accounts">
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>

<Story name="Mastodon Server" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.accounts().add('mastodon')
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
      pages.accounts().add('bluesky')
      pages.accounts().input.set('@sitnik.bsky.social')
      pages.accounts().submitting.set(true)
    }}
    route="accounts"
  >
    <AccountsPage page={pages.accounts()} />
  </Scene>
</Story>
