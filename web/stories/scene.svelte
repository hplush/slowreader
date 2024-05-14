<script lang="ts">
  import {
    addCategory,
    addFeed,
    Category,
    type CategoryValue,
    clearPreview,
    client,
    DEFAULT_REFRESH_STATISTICS,
    fastCategories,
    Feed,
    type FeedValue,
    Filter,
    hasFeeds,
    isRefreshing,
    type NetworkTypeDetector,
    Post,
    refreshStatistics,
    type RefreshStatistics,
    type Route,
    secondStep,
    testFeed
  } from '@slowreader/core'
  import { cleanStores } from 'nanostores'
  import { onMount } from 'svelte'

  import {
    baseRouter,
    type PreparedResponse,
    prepareResponses,
    setNetworkType
  } from './environment.js'

  const DEFAULT_NETWORK: ReturnType<NetworkTypeDetector> = {
    saveData: false,
    type: 'free'
  }

  export let refreshing: false | Partial<RefreshStatistics> = false
  export let route: Route = {
    params: {},
    route: 'slow'
  }
  export let fast = false
  export let networkType = DEFAULT_NETWORK

  export let categories: CategoryValue[] = []
  export let feeds: Partial<FeedValue>[] = [{ title: 'Example' }]

  export let responses: Record<string, PreparedResponse | string> = {}

  export let showSecondStep: boolean = false

  function cleanLogux(): void {
    clearPreview()
    client.get()?.clean()
    cleanStores(Feed, Filter, Category, Post, hasFeeds, fastCategories)
  }

  $: {
    cleanLogux()
    prepareResponses(responses)

    setNetworkType(networkType)

    for (let category of categories) {
      addCategory(category)
    }
    for (let feed of feeds) {
      addFeed(testFeed(feed))
    }

    // TODO: Replace with Nano Stores Context
    if (refreshing) {
      // @ts-expect-error
      isRefreshing.set(true)
      // @ts-expect-error
      refreshStatistics.set({ ...DEFAULT_REFRESH_STATISTICS, ...refreshing })
    } else {
      // @ts-expect-error
      isRefreshing.set(false)
      // @ts-expect-error
      refreshStatistics.set({ ...DEFAULT_REFRESH_STATISTICS })
    }

    if (fast) {
      baseRouter.set({
        params: { category: 'general' },
        route: 'fast'
      })
    } else {
      baseRouter.set(route)
    }

    secondStep.set(showSecondStep)
  }

  onMount(() => {
    return () => {
      // @ts-expect-error
      isRefreshing.set(false)
      baseRouter.set({ params: {}, route: 'slow' })
      setNetworkType(DEFAULT_NETWORK)
      cleanLogux()
    }
  })
</script>

<slot />
