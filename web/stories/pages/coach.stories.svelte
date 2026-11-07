<script context="module" lang="ts">
  import {
    getTables,
    nightLock,
    pages,
    showUsageBalance,
    trackUsage
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import CoachPage from '../../pages/coach.svelte'
  import { answerNightTaskWrong, lockAtNight } from '../environment.ts'
  import Scene from '../scene.svelte'

  function addUsage(now: Date): void {
    let end = now.getTime()
    let hour = 60 * 60 * 1000
    void getTables().usages.create([
      { from: end - 25 * hour, to: end - 23.99 * hour, type: 'slow' },
      { from: end - 20 * hour, to: end - 19 * hour, type: 'slow' },
      { from: end - 15 * hour, to: end - 14.8 * hour, type: 'fast' },
      { from: end - 8 * hour, to: end - 7.99 * hour, type: 'slow' },
      { from: end - 7.99 * hour, to: end - 7.98 * hour, type: 'fast' },
      { from: end - 7.98 * hour, to: end - 7.97 * hour, type: 'slow' },
      { from: end - 3 * hour, to: end - 2.5 * hour, type: 'fast' },
      { from: end - 2.5 * hour, to: end - 1.2 * hour, type: 'slow' },
      { from: end - 0.3 * hour, to: end - 0.29 * hour, type: 'fast' },
      { from: end - 0.01 * hour, to: end, type: 'fast' }
    ])
  }

  let { Story } = defineMeta({
    component: CoachPage,
    title: 'Pages/Coach'
  })
</script>

<Story name="Base" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      trackUsage.set(false)
    }}
    route="coach"
  >
    <CoachPage page={pages.coach()} />
  </Scene>
</Story>

<Story name="Enabled" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      nightLock.set({ enabled: true, from: 22, to: 6 })
      showUsageBalance.set(false)
      addUsage(new Date(2026, 0, 1, 12))
    }}
    route="coach"
  >
    <CoachPage page={pages.coach()} />
  </Scene>
</Story>

<Story
  name="Locked Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      lockAtNight()
      answerNightTaskWrong('coach')
      addUsage(new Date(2026, 0, 1, 23, 30))
    }}
    route="coach"
  >
    <CoachPage page={pages.coach()} />
  </Scene>
</Story>
