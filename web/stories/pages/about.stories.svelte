<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import AboutPage from '../../pages/about.svelte'
  import { clientUpdate } from '../../stores/client-update.ts'
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
      clientUpdate.set('available')
    }}
    route="about"
  >
    <AboutPage page={pages.about()} />
  </Scene>
</Story>

<Story
  name="Installed Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      installation.set('installed')
      clientUpdate.set('latest')
    }}
    route="about"
  >
    <AboutPage page={pages.about()} />
  </Scene>
</Story>

<Story name="Offline" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      installation.set('unavailable')
      clientUpdate.set('offline')
    }}
    route="about"
  >
    <AboutPage page={pages.about()} />
  </Scene>
</Story>

<Story name="Checking" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      installation.set('unavailable')
      clientUpdate.set('checking')
    }}
    route="about"
  >
    <AboutPage page={pages.about()} />
  </Scene>
</Story>
