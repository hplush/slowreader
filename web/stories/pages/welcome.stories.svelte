<script context="module" lang="ts">
  import { isDemo, markWelcomeStep } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import WelcomePage from '../../pages/welcome.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: WelcomePage,
    title: 'Pages/Welcome'
  })
</script>

<Story name="Demo" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ reading: 'slow' }]}
    oninit={() => {
      isDemo.set(true)
      markWelcomeStep('slow')
    }}
    route="welcome"
  >
    <WelcomePage />
  </Scene>
</Story>
