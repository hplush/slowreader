<script lang="ts">
  import {
    addCategory,
    addFeed,
    addPost,
    type BaseRoute,
    busy,
    cleanDatabase,
    client,
    closedCategories,
    currentPage,
    DEFAULT_REFRESH_STATISTICS,
    type FeedValue,
    hasPassword,
    needWelcome,
    type NewCategory,
    pages,
    type ParamlessRouteName,
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
    categories?: NewCategory[]
    children: Snippet
    feeds?: Partial<FeedValue>[]
    oninit?: () => void
    posts?: Partial<PostValue>[]
    responses?: [string, PreparedResponse | string][]
    route?: BaseRoute | Omit<BaseRoute, 'hash'> | ParamlessRouteName
    user?: boolean
  } = $props()

  async function fillScene(): Promise<void> {
    // Waits for the database too, so the app will not reset `busy`
    // and other stores, which the story sets in `oninit()`
    await cleanDatabase()
    for (let category of categories ?? []) {
      await addCategory(category)
    }
    for (let feed of feeds ?? []) {
      await addFeed(testFeed(feed))
    }
    for (let post of posts ?? []) {
      await addPost(testPost(post))
    }

    oninit()

    if (typeof route === 'string') {
      baseRouter.set({ hash: '', params: {}, route })
    } else {
      baseRouter.set(
        addHashToBaseRoute(route) ?? { hash: '', params: {}, route: 'slow' }
      )
    }
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
    prepareResponses(responses)
    busy.set(false)
    stopRefreshing()
    refreshStatus.set('start')
    refreshErrors.set([])
    syncStatus.set('synchronized')
    refreshStatistics.set(DEFAULT_REFRESH_STATISTICS)
    needWelcome.set(false)
    closedCategories.set(new Set())

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

    fillScene()
  })

  onDestroy(() => {
    unbindSyncStatus()
    busy.set(false)
    baseRouter.set({ hash: '', params: {}, route: 'slow' })
    for (let page of Object.values(pages)) {
      if (page.cache) page.cache = undefined
    }
    useReducedMotion.set(false)
    // @ts-expect-error Hack for tests
    systemReducedMotion.set(false)
  })
</script>

{@render children()}
