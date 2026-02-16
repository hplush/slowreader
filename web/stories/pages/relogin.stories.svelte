<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import ReloginPage from '../../pages/relogin.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: ReloginPage,
    title: 'Pages/Relogin'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="relogin">
    <ReloginPage page={pages.relogin()} />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene route="relogin">
    <ReloginPage page={pages.relogin()} />
  </Scene>
</Story>
