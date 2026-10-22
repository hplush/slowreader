<script lang="ts">
  import {
    type AccountValue,
    addCategory,
    addFeed,
    addPost,
    type BaseRoute,
    busy,
    cacheImages,
    cacheVideos,
    cleanDatabase,
    client,
    closedCategories,
    currentPage,
    DEFAULT_MEDIA_STATISTICS,
    DEFAULT_REFRESH_STATISTICS,
    extensionState,
    fastPostsLifetime,
    type FeedValue,
    getTables,
    hasCloud,
    hasSources,
    isDemo,
    mediaStatistics,
    type NetworkType,
    type NewCategory,
    openWarnings,
    pages,
    type ParamlessRouteName,
    passkeyOnly,
    type PostValue,
    refreshErrors,
    refreshStatistics,
    refreshStatus,
    requestMethod,
    showSensitiveMedia,
    signOut,
    startLocalUser,
    stopRefreshing,
    syncStatus,
    testAccount,
    testFeed,
    testPost,
    theme,
    useReducedMotion,
    welcomeSteps
  } from '@slowreader/core'
  import { testCredentials } from '@slowreader/core/test'
  import { onDestroy, type Snippet } from 'svelte'

  import { installingExtension } from '../main/extension.ts'
  import { systemReducedMotion } from '../stores/media-queries.ts'
  import {
    baseRouter,
    type PreparedResponse,
    prepareResponses,
    setMediaCacheSize,
    setNetworkType,
    setPasskeySupport
  } from './environment.ts'

  let {
    accounts,
    categories,
    children,
    feeds,
    network = 'free',
    oninit = () => {},
    passkeys = true,
    posts,
    responses = [],
    route,
    user = true
  }: {
    accounts?: Partial<AccountValue>[]
    categories?: NewCategory[]
    children: Snippet
    feeds?: Partial<FeedValue>[]
    network?: NetworkType
    oninit?: () => void
    passkeys?: boolean
    posts?: Partial<PostValue>[]
    responses?: [string, PreparedResponse | string][]
    route?: BaseRoute | Omit<BaseRoute, 'hash'> | ParamlessRouteName
    user?: boolean
  } = $props()

  async function fillScene(): Promise<void> {
    // Feeds page redirects to the first feed only once, so it must be
    // opened after the data was added
    baseRouter.set({ hash: '', params: {}, route: 'about' })
    if (user) await startLocalUser(testCredentials())
    // Waits for the database too, so the app will not reset `busy`
    // and other stores, which the story sets in `oninit()`
    await cleanDatabase()
    // Rows are added by a single action: a story with hundreds of posts
    // will be too slow with an action per row
    if (categories?.length) await addCategory(categories)
    if (accounts?.length) {
      await getTables().accounts.create(
        accounts.map(account => testAccount(account))
      )
    }
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
        route
          ? ({ hash: '', ...route } as BaseRoute)
          : { hash: '', params: {}, route: 'slow' }
      )
    }
  }

  let unbindSyncStatus = syncStatus.listen(() => {})

  $effect.pre(() => {
    currentPage.get().destroy()
    setPasskeySupport(passkeys)
    setNetworkType({ saveData: false, type: network })
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
    mediaStatistics.set(DEFAULT_MEDIA_STATISTICS)
    hasSources.set(!!feeds?.length)
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
    showSensitiveMedia.set(false)
    openWarnings.set(false)
    fastPostsLifetime.set('month')
    cacheImages.set('always')
    cacheVideos.set('never')
    setMediaCacheSize(0)
    setNetworkType({ saveData: false, type: 'free' })
    setPasskeySupport(true)
    // @ts-expect-error Hack for tests
    systemReducedMotion.set(false)
  })
</script>

{#if !user || $client}
  {@render children()}
{/if}
