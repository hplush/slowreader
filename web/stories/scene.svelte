<script lang="ts">
  import {
    addCategory,
    addFeed,
    type BaseRoute,
    Category,
    type CategoryValue,
    client,
    currentPage,
    DEFAULT_REFRESH_STATISTICS,
    Feed,
    type FeedValue,
    Filter,
    hasPassword,
    type ParamlessRouteName,
    Post,
    refreshIcon,
    refreshStatistics,
    signOut,
    stopRefreshing,
    syncStatus,
    testFeed,
    theme,
    useCredentials,
    useReducedMotion
  } from '@slowreader/core'
  import { addHashToBaseRoute, testCredentials } from '@slowreader/core/test'
  import { cleanStores } from 'nanostores'
  import { onDestroy, type Snippet } from 'svelte'

  import { systemReducedMotion } from '../stores/media-queries.ts'
  import {
    baseRouter,
    type PreparedResponse,
    prepareResponses
  } from './environment.ts'

  let {
    categories,
    children,
    feeds,
    oninit = () => {},
    responses = [],
    route,
    user = true
  }: {
    categories?: CategoryValue[]
    children: Snippet
    feeds?: Partial<FeedValue>[]
    oninit?: () => void
    responses?: [string, PreparedResponse | string][]
    route?: BaseRoute | Omit<BaseRoute, 'hash'> | ParamlessRouteName
    user?: boolean
  } = $props()

  function cleanLogux(): void {
    client.get()?.clean()
    cleanStores(Feed, Filter, Category, Post)
  }

  let unbindSyncStatus = syncStatus.listen(() => {})

  $effect.pre(() => {
    currentPage.get().destroy()
    if (user) {
      useCredentials(testCredentials())
      hasPassword.set(true)
    } else if (client.get()) {
      signOut()
    }
    cleanLogux()
    prepareResponses(responses)
    stopRefreshing()
    refreshIcon.set('start')
    syncStatus.set('synchronized')
    refreshStatistics.set(DEFAULT_REFRESH_STATISTICS)

    if (typeof route === 'string') {
      baseRouter.set({ hash: '', params: {}, route })
    } else {
      baseRouter.set(
        addHashToBaseRoute(route) ?? { hash: '', params: {}, route: 'slow' }
      )
    }

    function updateTheme(): void {
      let classes = document.documentElement.classList
      if (classes.contains('is-light-theme')) {
        theme.set('light')
      } else if (classes.contains('is-dark-theme')) {
        theme.set('dark')
      }
    }

    updateTheme()

    let htmlObserver = new MutationObserver(() => {
      updateTheme()
    })

    htmlObserver.observe(document.documentElement, {
      attributeFilter: ['class'],
      attributes: true
    })

    onDestroy(() => {
      htmlObserver.disconnect()
    })

    for (let category of categories ?? []) {
      addCategory(category)
    }
    for (let feed of feeds ?? []) {
      addFeed(testFeed(feed))
    }

    oninit()
  })

  onDestroy(() => {
    unbindSyncStatus()
    baseRouter.set({ hash: '', params: {}, route: 'slow' })
    cleanLogux()
    useReducedMotion.set(false)
    // @ts-expect-error Hack for tests
    systemReducedMotion.set(false)
  })
</script>

{@render children()}
