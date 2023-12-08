<script lang="ts">
  import {
    type BaseRoute,
    DEFAULT_REFRESH_STATISTICS,
    isRefreshing,
    type NetworkTypeDetector,
    refreshStatistics,
    type RefreshStatistics
  } from '@slowreader/core'
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

  $: {
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
  }

  onMount(() => {
    return () => {
      // @ts-expect-error
      isRefreshing.set(false)
      // @ts-expect-error
      router.set({ route: 'fast' })
      setNetworkType(DEFAULT_NETWORK)
    }
  })
</script>

<slot />
