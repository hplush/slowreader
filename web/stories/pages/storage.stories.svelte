<script context="module" lang="ts">
  import { fastPostsMaxAge, hasCloud, isDemo, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import StoragePage from '../../pages/storage.svelte'
  import { setMediaCacheSize } from '../environment.ts'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: StoragePage,
    title: 'Pages/Storage'
  })

  // Page asks for the size before the scene calls `oninit`
  function withMedia(): ReturnType<typeof pages.storage> {
    setMediaCacheSize(345_678_901)
    return pages.storage()
  }
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="storage">
    <StoragePage page={pages.storage()} />
  </Scene>
</Story>

<Story name="Local" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasCloud.set(false)
      fastPostsMaxAge.set(0)
    }}
    route="storage"
  >
    <StoragePage page={withMedia()} />
  </Scene>
</Story>

<Story name="Demo" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasCloud.set(false)
      isDemo.set(true)
    }}
    route="storage"
  >
    <StoragePage page={pages.storage()} />
  </Scene>
</Story>
