<script lang="ts">
  import {
    addCategory,
    addFeed,
    addPost,
    type BaseRoute,
    Category,
    type CategoryValue,
    client,
    closedCategories,
    currentPage,
    DEFAULT_REFRESH_STATISTICS,
    Feed,
    type FeedValue,
    Filter,
    hasPassword,
    needWelcome,
    pages,
    type ParamlessRouteName,
    Post,
    type PostValue,
    refreshErrors,
    refreshStatistics,
    refreshStatus,
    signOut,
    stopRefreshing,
    syncStatus,
    testFeed,
    testPost,
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
    posts,
    responses = [],
    route,
    user = true
  }: {
    categories?: CategoryValue[]
    children: Snippet
    feeds?: Partial<FeedValue>[]
    oninit?: () => void
    posts?: Partial<PostValue>[]
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
    refreshStatus.set('start')
    refreshErrors.set([])
    syncStatus.set('synchronized')
    refreshStatistics.set(DEFAULT_REFRESH_STATISTICS)
    needWelcome.set(false)
    closedCategories.set(new Set())

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
    for (let post of posts ?? []) {
      addPost(testPost(post))
    }

    oninit()
  })

  onDestroy(() => {
    unbindSyncStatus()
    baseRouter.set({ hash: '', params: {}, route: 'slow' })
    cleanLogux()
    for (let page of Object.values(pages)) {
      if (page.cache) page.cache = undefined
    }
    useReducedMotion.set(false)
    // @ts-expect-error Hack for tests
    systemReducedMotion.set(false)
  })
</script>

{@render children()}
