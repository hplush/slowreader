<script lang="ts">
  import type { RefreshStatistics } from '@slowreader/core'
  import {
    DEFAULT_REFRESH_STATISTICS,
    isRefreshing,
    refreshStatistics
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  export let refreshing: false | Partial<RefreshStatistics> = false

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
  })
</script>

<slot />
