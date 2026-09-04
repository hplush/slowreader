<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

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
