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
    extensionState,
    type FeedValue,
    hasCloud,
    hasFeeds,
    isDemo,
    type NewCategory,
    pages,
    type ParamlessRouteName,
    passkeyOnly,
    type PostValue,
    refreshErrors,
    refreshStatistics,
    refreshStatus,
    requestMethod,
    signOut,
    startLocalUser,
    stopRefreshing,
    syncStatus,
    testFeed,
    testPost,
    theme,
    useReducedMotion,
    welcomeSteps
  } from '@slowreader/core'
  import { addHashToBaseRoute, testCredentials } from '@slowreader/core/test'
  import { onDestroy, type Snippet } from 'svelte'

  import { installingExtension } from '../main/extension.ts'
  import { systemReducedMotion } from '../stores/media-queries.ts'
  import {
    baseRouter,
    type PreparedResponse,
    prepareResponses,
    setPasskeySupport
  } from './environment.ts'

  let {
    categories,
    children,
    feeds,
    oninit = () => {},
    passkeys = true,
    posts,
    responses = [],
    route,
    user = true
  }: {
    categories?: NewCategory[]
    children: Snippet
    feeds?: Partial<FeedValue>[]
    oninit?: () => void
    passkeys?: boolean
    posts?: Partial<PostValue>[]
    responses?: [string, PreparedResponse | string][]
    route?: BaseRoute | Omit<BaseRoute, 'hash'> | ParamlessRouteName
    user?: boolean
  } = $props()

  async function fillScene(): Promise<void> {
    if (user) await startLocalUser(testCredentials())
    // Waits for the database too, so the app will not reset `busy`
    // and other stores, which the story sets in `oninit()`
    await cleanDatabase()
    // Rows are added by a single action: a story with hundreds of posts
    // will be too slow with an action per row
    if (categories?.length) await addCategory(categories)
    if (feeds?.length) await addFeed(feeds.map(feed => testFeed(feed)))
    if (posts?.length) {
      await addPost(
        posts.map((post, index) => {
          return testPost({
            id: `post-${index + 1}`,
            publishedAt: 1000 - index,
            ...post
          })
        })
      )
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
    setPasskeySupport(passkeys)
    if (user) {
      hasCloud.set(true)
    } else if (client.get()) {
      signOut()
    }
    prepareResponses(responses)
    isDemo.set(false)
    passkeyOnly.set(false)
    extensionState.set('missing')
    installingExtension.set(false)
    requestMethod.set(undefined)
    busy.set(false)
    stopRefreshing()
    refreshStatus.set('start')
    refreshErrors.set([])
    syncStatus.set('synchronized')
    refreshStatistics.set(DEFAULT_REFRESH_STATISTICS)
    hasFeeds.set(!!feeds?.length)
    welcomeSteps.set(undefined)
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
    setPasskeySupport(true)
    // @ts-expect-error Hack for tests
    systemReducedMotion.set(false)
  })
</script>

{#if !user || $client}
  {@render children()}
{/if}
