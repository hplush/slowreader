<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FatalPage from '../../pages/fatal.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: FatalPage,
    title: 'Pages/Fatal'
  })
</script>

<script lang="ts">
  import { fatal, pages } from '@slowreader/core'
</script>

<Story name="Not Found" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="fatal" user={false}>
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story name="Outdated" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    route={{ params: { reason: 'outdated' }, route: 'fatal' }}
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story name="Broken Database" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      fatal.set({
        error: 'Database disk image is malformed',
        type: 'brokenDatabase'
      })
    }}
    route="fatal"
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>

<Story
  name="Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      fatal.set({
        error: 'Database disk image is malformed',
        type: 'brokenDatabase'
      })
    }}
    route="fatal"
    user={false}
  >
    <FatalPage page={pages.fatal()} />
  </Scene>
</Story>
