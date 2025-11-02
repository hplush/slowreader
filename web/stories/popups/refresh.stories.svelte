<script context="module" lang="ts">
  import {
    refreshErrors,
    refreshStatistics,
    refreshStatus,
    testFeed
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import RefreshPopup from '../../popups/refresh.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: RefreshPopup,
    title: 'Popups/Refresh'
  })
</script>

<Story name="Initial" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <RefreshPopup />
  </Scene>
</Story>

<Story name="Stopped" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      refreshStatus.set('done')
      refreshStatistics.set({
        errorFeeds: 0,
        errorRequests: 0,
        foundFast: 0,
        foundSlow: 0,
        initializing: false,
        processedFeeds: 100,
        totalFeeds: 100
      })
    }}
  >
    <RefreshPopup />
  </Scene>
</Story>

<Story name="Running" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      refreshStatus.set('refreshing')
      refreshStatistics.set({
        errorFeeds: 0,
        errorRequests: 0,
        foundFast: 15,
        foundSlow: 2,
        initializing: false,
        processedFeeds: 31,
        totalFeeds: 100
      })
    }}
  >
    <RefreshPopup />
  </Scene>
</Story>

<Story name="Errors" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      refreshStatus.set('refreshing')
      refreshStatistics.set({
        errorFeeds: 2,
        errorRequests: 2,
        foundFast: 15,
        foundSlow: 2,
        initializing: false,
        processedFeeds: 31,
        totalFeeds: 100
      })
      refreshErrors.set([
        { error: 'Timeout error', feed: testFeed() },
        { error: '500 server response', feed: testFeed() }
      ])
    }}
  >
    <RefreshPopup />
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
      refreshStatus.set('refreshing')
      refreshStatistics.set({
        errorFeeds: 0,
        errorRequests: 0,
        foundFast: 15,
        foundSlow: 2,
        initializing: false,
        processedFeeds: 31,
        totalFeeds: 100
      })
    }}
  >
    <RefreshPopup />
  </Scene>
</Story>
