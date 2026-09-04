<script context="module" lang="ts">
  import { requestMethod } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import { hasExtension } from '../../main/extension.ts'
  import NetworkPage from '../../pages/network.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: NetworkPage,
    title: 'Pages/Network'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="network">
    <NetworkPage />
  </Scene>
</Story>

<Story name="Extension" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasExtension.set(true)
      requestMethod.set('extension')
    }}
    route="network"
  >
    <NetworkPage />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="network">
    <NetworkPage />
  </Scene>
</Story>
