<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import UpdateClientPage from '../../pages/update-client.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: UpdateClientPage,
    title: 'Pages/Update Client'
  })
</script>

<Story name="Light" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="updateClient" user={false}>
    <UpdateClientPage page={pages.updateClient()} />
  </Scene>
</Story>

<Story
  name="Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene route="updateClient" user={false}>
    <UpdateClientPage page={pages.updateClient()} />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="updateClient" user={false}>
    <UpdateClientPage page={pages.updateClient()} />
  </Scene>
</Story>
