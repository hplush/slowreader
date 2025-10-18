<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import InterfacePage from '../../pages/interface.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: InterfacePage,
    title: 'Pages/Interface'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="about">
    <InterfacePage />
  </Scene>
</Story>
