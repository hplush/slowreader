<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import StartPage from '../../pages/start.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: StartPage,
    title: 'Pages/Start'
  })
</script>

<Story name="Light" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story
  name="Dark"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene>
    <StartPage page={pages.start()} />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{
    viewport: { value: 'mobile1' }
  }}
  parameters={{
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile1' }
  }}
>
  <Scene>
    <StartPage page={pages.start()} />
  </Scene>
</Story>
