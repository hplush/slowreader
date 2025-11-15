<script context="module" lang="ts">
  import { needWelcome, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FeedsPage from '../../pages/feeds/index.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: FeedsPage,
    title: 'Pages/Feeds'
  })
</script>

<Story name="Slow Welcome" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      needWelcome.set(true)
    }}
    route="slow"
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="Fast Welcome" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      needWelcome.set(true)
    }}
    route="fast"
  >
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Slow Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[{}]} route="slow">
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="Fast Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[{}]} route="fast">
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>
