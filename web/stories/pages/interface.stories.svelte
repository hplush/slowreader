<script context="module" lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import InterfacePage from '../../pages/interface.svelte'
  import { systemReducedMotion } from '../../stores/reduced-motion.ts'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: InterfacePage,
    title: 'Pages/Interface'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="interface">
    <InterfacePage />
  </Scene>
</Story>

<Story name="Reduced Motion" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      // @ts-expect-error Hack for tests
      systemReducedMotion.set(true)
    }}
    route="interface"
  >
    <InterfacePage />
  </Scene>
</Story>
