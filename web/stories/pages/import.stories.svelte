<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import ImportPage from '../../pages/import.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: ImportPage,
    title: 'Pages/Import'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="import">
    <ImportPage page={pages.import()} />
  </Scene>
</Story>

<Story name="Format Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.import().fileError.set('unknownFormat')
    }}
    route="import"
  >
    <ImportPage page={pages.import()} />
  </Scene>
</Story>

<Story name="Importing" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.import().importing.set(0.5)
      pages.import().feedErrors.set([
        ['https://example.com/feed1.xml', 'unloadable'],
        ['https://example.com/feed2.xml', 'unknown']
      ])
    }}
    route="import"
  >
    <ImportPage page={pages.import()} />
  </Scene>
</Story>

<Story name="Done" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      pages.import().done.set(3)
      pages.import().feedErrors.set([
        ['https://example.com/feed1.xml', 'unloadable'],
        ['https://example.com/feed2.xml', 'unknown']
      ])
    }}
    route="import"
  >
    <ImportPage page={pages.import()} />
  </Scene>
</Story>
