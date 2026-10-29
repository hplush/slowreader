<script context="module" lang="ts">
  import {
    customPostFont,
    postFont,
    postLineHeight,
    textSize
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import InterfacePage from '../../pages/interface.svelte'
  import { hasInAppBrowser } from '../../stores/links.ts'
  import { systemReducedMotion } from '../../stores/media-queries.ts'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: InterfacePage,
    title: 'Pages/Interface'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      hasInAppBrowser.set(true)
    }}
    route="interface"
  >
    <InterfacePage />
  </Scene>
</Story>

<Story
  name="Reduced Motion & Own Font"
  asChild
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      // @ts-expect-error Hack for tests
      systemReducedMotion.set(true)
      hasInAppBrowser.set(false)
      textSize.set(120)
      postFont.set('custom')
      postLineHeight.set('relaxed')
      customPostFont.set('Comic Sans MS')
    }}
    route="interface"
  >
    <InterfacePage />
  </Scene>
</Story>
