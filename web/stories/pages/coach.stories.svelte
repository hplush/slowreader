<script context="module" lang="ts">
  import { nightLock, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import CoachPage from '../../pages/coach.svelte'
  import { answerNightTaskWrong, lockAtNight } from '../environment.ts'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: CoachPage,
    title: 'Pages/Coach'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="coach">
    <CoachPage page={pages.coach()} />
  </Scene>
</Story>

<Story name="Enabled" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      nightLock.set({ enabled: true, from: 22, to: 6 })
    }}
    route="coach"
  >
    <CoachPage page={pages.coach()} />
  </Scene>
</Story>

<Story
  name="Locked"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      lockAtNight()
      answerNightTaskWrong('coach')
    }}
    route="coach"
  >
    <CoachPage page={pages.coach()} />
  </Scene>
</Story>
