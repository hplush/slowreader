<script lang="ts" module>
  import {
    DEFAULT_REFRESH_STATISTICS,
    isRefreshing,
    refreshStatistics
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

<Story name="Light Slow" asChild>
  <Scene>
    <Navbar />
  </Scene>
</Story>

<Story name="Light Fast" asChild>
  <Scene route="fast">
    <Navbar />
  </Scene>
</Story>

<Story name="Add" asChild>
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
  parameters={{ themes: { themeOverride: 'dark' } }}
>
  <Scene>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Dark Fast"
  asChild
  parameters={{ themes: { themeOverride: 'dark' } }}
>
  <Scene route="fast">
    <Navbar />
  </Scene>
</Story>

<Story name="Scroll" asChild>
  <Scene>
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
  <Scene route={{ hash: 'refresh=1', params: {}, route: 'interface' }}>
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
