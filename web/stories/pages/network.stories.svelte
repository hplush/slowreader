<script context="module" lang="ts">
  import {
    cacheMediaReading,
    cacheVideos,
    extensionState,
    requestMethod
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import { extensionStore, installingExtension } from '../../main/extension.ts'
  import NetworkPage from '../../pages/network.svelte'
  import { clientUpdate } from '../../stores/client-update.ts'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: NetworkPage,
    title: 'Pages/Network'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      clientUpdate.set(undefined)
    }}
    route="network"
  >
    <NetworkPage />
  </Scene>
</Story>

<Story name="Extension" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    network="unknown"
    oninit={() => {
      clientUpdate.set('latest')
      extensionState.set('granted')
      requestMethod.set('extension')
      cacheMediaReading.set('slow')
      cacheVideos.set('free')
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
      cacheMediaReading.set('none')
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

<Story name="Safari" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      extensionStore.set(undefined)
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
