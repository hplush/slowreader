<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import AboutPage from '../../pages/about.svelte'
  import { installation } from '../../stores/install.ts'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: AboutPage,
    title: 'Pages/About'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      installation.set('available')
    }}
    route="about"
  >
    <AboutPage page={pages.about()} />
  </Scene>
</Story>

<Story name="Installed" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      installation.set('installed')
    }}
    route="about"
  >
    <AboutPage page={pages.about()} />
  </Scene>
</Story>
