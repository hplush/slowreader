<script lang="ts">
  import {
    addCategory,
    addFeed,
    addHashToBaseRoute,
    type BaseRoute,
    Category,
    type CategoryValue,
    client,
    DEFAULT_REFRESH_STATISTICS,
    Feed,
    type FeedValue,
    Filter,
    isRefreshing,
    type NetworkTypeDetector,
    Post,
    refreshStatistics,
    type RefreshStatistics,
    testFeed
  } from '@slowreader/core'
  import { cleanStores, type ReadableAtom, type WritableAtom } from 'nanostores'
  import type { Snippet } from 'svelte'
  import { onMount } from 'svelte'

  import {
    baseRouter,
    type PreparedResponse,
    prepareResponses,
    setNetworkType
  } from './environment.ts'

  const DEFAULT_NETWORK: ReturnType<NetworkTypeDetector> = {
    saveData: false,
    type: 'free'
  }

  let {
    categories = [],
    children,
    feeds = [{ title: 'Example' }],
    networkType = DEFAULT_NETWORK,
    refreshing = false,
    responses = {},
    route
  }: {
    categories?: CategoryValue[]
    children: Snippet
    feeds?: Partial<FeedValue>[]
    networkType?: ReturnType<NetworkTypeDetector>
    refreshing?: false | Partial<RefreshStatistics>
    responses?: Record<string, PreparedResponse | string>
    route?: BaseRoute | Omit<BaseRoute, 'hash'>
  } = $props()

  export function forceSet<Value>(
    store: ReadableAtom<Value>,
    value: Value
  ): void {
    ;(store as WritableAtom<Value>).set(value)
  }

  function cleanLogux(): void {
    client.get()?.clean()
    cleanStores(Feed, Filter, Category, Post)
  }

  $effect.pre(() => {
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
    forceSet(isRefreshing, Boolean(refreshing))
    forceSet(refreshStatistics, {
      ...DEFAULT_REFRESH_STATISTICS,
      ...refreshing
    })

    baseRouter.set(
      addHashToBaseRoute(route) ?? { hash: '', params: {}, route: 'slow' }
    )
  })

  onMount(() => {
    return () => {
      forceSet(isRefreshing, false)
      baseRouter.set({ hash: '', params: {}, route: 'slow' })
      setNetworkType(DEFAULT_NETWORK)
      cleanLogux()
    }
  })
</script>

{@render children()}
