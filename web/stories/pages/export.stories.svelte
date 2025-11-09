<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import ExportPage from '../../pages/export.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: ExportPage,
    title: 'Pages/Export'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="export">
    <ExportPage page={pages.export()} />
  </Scene>
</Story>

<Story name="Exporting" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.export().exportingOpml.set(true)
    }}
    route="export"
  >
    <ExportPage page={pages.export()} />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="export">
    <ExportPage page={pages.export()} />
  </Scene>
</Story>
