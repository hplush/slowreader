<script lang="ts">
  import {
    type BaseRoute,
    DEFAULT_REFRESH_STATISTICS,
    isRefreshing,
    refreshStatistics,
    type RefreshStatistics,
    router
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  export let refreshing: false | Partial<RefreshStatistics> = false
  export let route: BaseRoute = { params: {}, route: 'fast' }
  export let slow = false

  onMount(() => {
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
      // @ts-expect-error
      router.set({ route: 'slowAll' })
    } else {
      // @ts-expect-error
      router.set(route)
    }

    return () => {
      // @ts-expect-error
      isRefreshing.set(false)
      // @ts-expect-error
      router.set({ route: 'fast' })
    }
  })
</script>

<slot />
