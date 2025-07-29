<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import AboutPage from '../../pages/about.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: AboutPage,
    title: 'Pages/About'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="about">
    <AboutPage page={pages.about()} />
  </Scene>
</Story>
