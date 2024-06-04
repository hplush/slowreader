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
    fastCategory,
    type FastEntry,
    fastLoading,
    fastPosts,
    Feed,
    type FeedValue,
    Filter,
    hasFeeds,
    isRefreshing,
    type NetworkTypeDetector,
    nextFastSince,
    openedFastPost,
    openedSlowPost,
    Post,
    type PostValue,
    refreshStatistics,
    type RefreshStatistics,
    type Route,
    secondStep,
    slowPosts,
    type SlowPostsValue,
    testFeed,
    totalSlowPages,
    totalSlowPosts
  } from '@slowreader/core'
  import { cleanStores } from 'nanostores'
  import { onMount } from 'svelte'

  import { forceSet } from '../../core/lib/stores.js'
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
  export let openedPost: PostValue | undefined = undefined
  export let fasts: FastEntry[] = []
  export let showPagination = false

  export let responses: Record<string, PreparedResponse | string> = {}

  export let showSecondStep: boolean = false

  const initialSlow: SlowPostsValue = {
    isLoading: true
  }
  export let slowState: SlowPostsValue = initialSlow

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
    forceSet(isRefreshing, Boolean(refreshing))
    forceSet(refreshStatistics, {
      ...DEFAULT_REFRESH_STATISTICS,
      ...refreshing
    })

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
    forceSet(slowPosts, slowState)

    // @ts-expect-error
    forceSet(openedSlowPost, openedPost)
    // @ts-expect-error
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

    return () => {
      forceSet(isRefreshing, false)
      baseRouter.set({ params: {}, route: 'slow' })
      setNetworkType(DEFAULT_NETWORK)
      cleanLogux()
      forceSet(slowPosts, initialSlow)

      forceSet(openedSlowPost, undefined)
      forceSet(openedFastPost, undefined)

      forceSet(totalSlowPages, 1)
      forceSet(totalSlowPosts, 0)

      forceSet(fastLoading, 'init')
      forceSet(fastCategory, undefined)
    }
  })
</script>

<slot />
