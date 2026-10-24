<script context="module" lang="ts">
  import { hasCloud, isDemo, markWelcomeStep } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import WelcomePage from '../../pages/welcome.svelte'
  import { installation, safariBrowser } from '../../stores/install.ts'
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
      installation.set('unavailable')
      safariBrowser.set(false)
    }}
    route="welcome"
  >
    <WelcomePage />
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      installation.set('available')
      safariBrowser.set(false)
    }}
    route="welcome"
  >
    <WelcomePage />
  </Scene>
</Story>

<Story
  name="Safari Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      hasCloud.set(false)
      installation.set('unavailable')
      safariBrowser.set(true)
    }}
    route="welcome"
  >
    <WelcomePage />
  </Scene>
</Story>

<Story name="Safari" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ reading: 'slow' }]}
    oninit={() => {
      hasCloud.set(false)
      installation.set('unavailable')
      safariBrowser.set(true)
      isDemo.set(true)
      markWelcomeStep('slow', 'fast', 'clean', 'import')
    }}
    route="welcome"
  >
    <WelcomePage />
  </Scene>
</Story>
