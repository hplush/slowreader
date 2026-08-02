<script context="module" lang="ts">
  import { busy } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import BusyPage from '../../pages/busy.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: BusyPage,
    title: 'Pages/Busy'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      busy.set({})
    }}
  >
    <BusyPage />
  </Scene>
</Story>

<Story name="Label" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      busy.set({ label: 'Creating database' })
    }}
  >
    <BusyPage />
  </Scene>
</Story>

<Story name="Progress" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      busy.set({
        label: 'Creating benchmark data',
        progress: 0.72
      })
    }}
  >
    <BusyPage />
  </Scene>
</Story>

<Story name="Long Label" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      busy.set({
        label:
          'Creating benchmark data with a very long description, ' +
          'which should be wrapped to a few lines on any screen',
        progress: 0.72
      })
    }}
  >
    <BusyPage />
  </Scene>
</Story>
