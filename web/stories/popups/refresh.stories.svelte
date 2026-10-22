<script context="module" lang="ts">
  import {
    HTTPStatusError,
    mediaStatistics,
    NetworkError,
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
      mediaStatistics.set({ done: 117, failed: 3, total: 120 })
    }}
  >
    <RefreshPopup />
  </Scene>
</Story>

<Story name="Saving Media" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      refreshStatus.set('refreshing')
      refreshStatistics.set({
        errorFeeds: 0,
        errorRequests: 0,
        foundFast: 15,
        foundSlow: 2,
        initializing: false,
        processedFeeds: 100,
        totalFeeds: 100
      })
      mediaStatistics.set({ done: 40, failed: 2, total: 120 })
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
        {
          error: new NetworkError(new TypeError('fetch failed')),
          feed: testFeed()
        },
        {
          error: new HTTPStatusError(500, 'server is down', '', new Headers()),
          feed: testFeed({
            title:
              'Veryveryverylongfeedtitletooverflowthelistinthepopupcontentareaattheleftpfthepage'
          })
        }
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
