<script lang="ts" module>
  import {
    DEFAULT_REFRESH_STATISTICS,
    isRefreshing,
    refreshStatistics
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Navbar from '../../ui/navbar.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: Navbar,
    title: 'UI/Navbar'
  })
</script>

<Story name="Light" asChild>
  <Scene>
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

<Story name="Dark" asChild parameters={{ themes: { themeOverride: 'dark' } }}>
  <Scene>
    <Navbar />
  </Scene>
</Story>
