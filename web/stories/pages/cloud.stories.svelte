<script context="module" lang="ts">
  import { hasPassword, pages, syncStatus } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import CloudPage from '../../pages/cloud.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: CloudPage,
    title: 'Pages/Cloud'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="cloud">
    <CloudPage page={pages.cloud()} />
  </Scene>
</Story>

<Story name="Local" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasPassword.set(false)
    }}
    route="cloud"
  >
    <CloudPage page={pages.cloud()} />
  </Scene>
</Story>

<Story name="Unsaved" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('wait')
    }}
    route="cloud"
  >
    <CloudPage page={pages.cloud()} />
  </Scene>
</Story>
