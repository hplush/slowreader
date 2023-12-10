<script lang="ts">
  import {
    addCategory,
    addFeed,
    type BaseRoute,
    Category,
    type CategoryValue,
    client,
    DEFAULT_REFRESH_STATISTICS,
    Feed,
    type FeedValue,
    Filter,
    hasFeeds,
    isRefreshing,
    type NetworkTypeDetector,
    Post,
    refreshStatistics,
    type RefreshStatistics,
    testFeed
  } from '@slowreader/core'
  import { cleanStores } from 'nanostores'
  import { onMount } from 'svelte'

  import { router, setNetworkType } from './environment.js'

  const DEFAULT_NETWORK: ReturnType<NetworkTypeDetector> = {
    saveData: false,
    type: 'free'
  }

  export let refreshing: false | Partial<RefreshStatistics> = false
  export let route: BaseRoute = { params: {}, route: 'fast' }
  export let slow = false
  export let networkType = DEFAULT_NETWORK
  export let categories: CategoryValue[] = []
  export let feeds: Partial<FeedValue>[] = [{ title: 'Example' }]

  function cleanLogux(): void {
    client.get()?.clean()
    cleanStores(Feed, Filter, Category, Post, hasFeeds)
  }

  $: {
    cleanLogux()

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

    if (slow) {
      router.set({ params: {}, route: 'slowAll' })
    } else {
      router.set(route)
    }

    setNetworkType(networkType)

    for (let category of categories) {
      addCategory(category)
    }
    for (let feed of feeds) {
      addFeed(testFeed(feed))
    }
  }

  onMount(() => {
    return () => {
      // @ts-expect-error
      isRefreshing.set(false)
      // @ts-expect-error
      router.set({ route: 'fast' })
      setNetworkType(DEFAULT_NETWORK)
      cleanLogux()
    }
  })
</script>

<slot />
