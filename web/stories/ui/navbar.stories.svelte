<script lang="ts" module>
  import {
    DEFAULT_REFRESH_STATISTICS,
    isRefreshing,
    refreshStatistics,
    syncStatus
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Navbar from '../../ui/navbar.svelte'
  import Scene from '../scene.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Navbar,
    title: 'UI/Navbar'
  })
</script>

<Story name="Light Slow" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <Navbar />
  </Scene>
</Story>

<Story name="Light Fast" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('wait')
    }}
    route="fast"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Connecting" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('connectingAfterWait')
    }}
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Synchronized" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('synchronizedAfterWait')
    }}
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Sync Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('error')
    }}
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Add" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      isRefreshing.set(true)
      refreshStatistics.set({
        ...DEFAULT_REFRESH_STATISTICS,
        processedFeeds: 2,
        totalFeeds: 4
      })
    }}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>

<Story
  name="Dark Light"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Dark Fast"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      syncStatus.set('disconnected')
    }}
    route="fast"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Scroll" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('disconnected')
    }}
    route="add"
  >
    <Section height={300}>
      <Navbar />
    </Section>
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile1' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Mobile Back"
  asChild
  globals={{ viewport: { value: 'mobile1' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      syncStatus.set('wait')
    }}
    route={{ hash: 'refresh=1', params: {}, route: 'interface' }}
  >
    <Navbar />
  </Scene>
</Story>

<Story
  name="Tablet"
  asChild
  globals={{ viewport: { value: 'tablet' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene>
    <Navbar />
  </Scene>
</Story>
