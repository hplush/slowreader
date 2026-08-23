<script context="module" lang="ts">
  import { hasPassword, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import StoragePage from '../../pages/storage.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: StoragePage,
    title: 'Pages/Storage'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="storage">
    <StoragePage page={pages.storage()} />
  </Scene>
</Story>

<Story name="Local" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasPassword.set(false)
    }}
    route="storage"
  >
    <StoragePage page={pages.storage()} />
  </Scene>
</Story>
