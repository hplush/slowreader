<script context="module" lang="ts">
  import { requestMethod } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import { extensionState, installingExtension } from '../../main/extension.ts'
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
      extensionState.set('granted')
      requestMethod.set('extension')
    }}
    route="network"
  >
    <NetworkPage />
  </Scene>
</Story>

<Story name="Installing" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      installingExtension.set(true)
    }}
    route="network"
  >
    <NetworkPage />
  </Scene>
</Story>

<Story name="Restricted" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      extensionState.set('restricted')
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
