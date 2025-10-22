<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import AddPage from '../../pages/add.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: AddPage,
    title: 'Pages/Add'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="add">
    <AddPage page={pages.add()} />
  </Scene>
</Story>
