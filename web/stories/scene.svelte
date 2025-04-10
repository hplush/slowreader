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
    fastCategories,
    fastCategory,
    type FastEntry,
    fastLoading,
    fastPosts,
    Feed,
    type FeedsByCategory,
    type FeedValue,
    Filter,
    importedFeedsByCategory,
    importErrors,
    importLoadingFeeds,
    importReading,
    importSubscribe,
    importUnLoadedFeeds,
    isRefreshing,
    type NetworkTypeDetector,
    nextFastSince,
    openedFastPost,
    openedSlowPost,
    Post,
    type PostValue,
    refreshStatistics,
    type RefreshStatistics,
    selectAllImportedFeeds,
    slowPosts,
    type SlowPostsValue,
    testFeed,
    totalSlowPages,
    totalSlowPosts
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

  const INITIAL_SLOW: SlowPostsValue = {
    isLoading: true
  }

  let {
    categories = [],
    children,
    errors = [],
    fast = false,
    fasts = [],
    feeds = [{ title: 'Example' }],
    feedsByCategory = [],
    loadingFeeds = {},
    networkType = DEFAULT_NETWORK,
    openedPost,
    refreshing = false,
    responses = {},
    route,
    showPagination = false,
    slowState = INITIAL_SLOW,
    unloadedFeeds = []
  }: {
    categories?: CategoryValue[]
    children: Snippet
    errors?: string[]
    fast?: boolean
    fasts?: FastEntry[]
    feeds?: Partial<FeedValue>[]
    feedsByCategory?: FeedsByCategory
    loadingFeeds?: Record<string, boolean>
    networkType?: ReturnType<NetworkTypeDetector>
    openedPost?: PostValue | undefined
    refreshing?: false | Partial<RefreshStatistics>
    responses?: Record<string, PreparedResponse | string>
    route?: BaseRoute | Omit<BaseRoute, 'hash'>
    showPagination?: boolean
    slowState?: SlowPostsValue
    unloadedFeeds?: string[]
  } = $props()

  export function forceSet<Value>(
    store: ReadableAtom<Value>,
    value: Value
  ): void {
    ;(store as WritableAtom<Value>).set(value)
  }

  function cleanLogux(): void {
    client.get()?.clean()
    cleanStores(Feed, Filter, Category, Post, fastCategories)
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

    if (fast) {
      baseRouter.set({
        hash: '',
        params: { category: 'general' },
        route: 'fast'
      })
    } else {
      baseRouter.set(
        addHashToBaseRoute(route) ?? { hash: '', params: {}, route: 'slow' }
      )
    }
  })

  onMount(() => {
    forceSet(slowPosts, slowState)

    // @ts-expect-error Hack to change state for testing
    forceSet(openedSlowPost, openedPost)
    // @ts-expect-error Hack to change state for testing
    forceSet(openedFastPost, openedPost)

    if (fasts.length) {
      forceSet(fastPosts, fasts)
      forceSet(fastLoading, false)
      forceSet(fastCategory, fasts[0]?.feed.categoryId)
    }

    forceSet(fastPosts, fasts)

    if (showPagination) {
      forceSet(totalSlowPages, 10)
      forceSet(totalSlowPosts, 1_000)
      forceSet(nextFastSince, fasts.length)
    }

    // import stories
    if (unloadedFeeds.length) {
      forceSet(importUnLoadedFeeds, unloadedFeeds)
    }

    if (Object.keys(loadingFeeds).length) {
      forceSet(importLoadingFeeds, loadingFeeds)
      forceSet(importReading, true)
    }

    if (errors.length) {
      forceSet(importErrors, errors)
    }

    if (feedsByCategory.length) {
      forceSet(importedFeedsByCategory, feedsByCategory)
      importSubscribe()
      selectAllImportedFeeds()
    }

    return () => {
      forceSet(isRefreshing, false)
      baseRouter.set({ hash: '', params: {}, route: 'slow' })
      setNetworkType(DEFAULT_NETWORK)
      cleanLogux()
      forceSet(slowPosts, INITIAL_SLOW)

      forceSet(openedSlowPost, undefined)
      forceSet(openedFastPost, undefined)

      forceSet(totalSlowPages, 1)
      forceSet(totalSlowPosts, 0)

      forceSet(fastLoading, 'init')
      forceSet(fastCategory, undefined)

      forceSet(importUnLoadedFeeds, [])
      forceSet(importLoadingFeeds, {})
      forceSet(importReading, false)
      forceSet(importErrors, [])
      forceSet(importedFeedsByCategory, [])
    }
  })
</script>

{@render children()}
