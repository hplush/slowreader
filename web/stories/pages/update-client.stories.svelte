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
