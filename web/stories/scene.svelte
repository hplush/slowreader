<script lang="ts">
  import {
    type AccountValue,
    addCategory,
    addFeed,
    addPost,
    autoRefresh,
    type BaseRoute,
    busy,
    cacheImages,
    cacheMediaReading,
    cacheVideos,
    cleanDatabase,
    client,
    clock,
    closedCategories,
    currentPage,
    customPostFont,
    DEFAULT_MEDIA_STATISTICS,
    DEFAULT_REFRESH_STATISTICS,
    extensionState,
    fastPostsMaxAge,
    type FeedValue,
    generalFastReader,
    generalSlowReader,
    getTables,
    hasCloud,
    hasSources,
    isDemo,
    lastUsage,
    mediaErrors,
    mediaStatistics,
    type NetworkType,
    type NewCategory,
    nightLock,
    noStatistics,
    openWarnings,
    pages,
    type ParamlessRouteName,
    passkeyOnly,
    postFont,
    postLineHeight,
    type PostValue,
    refreshErrors,
    refreshStatistics,
    refreshStatus,
    requestMethod,
    showSensitiveMedia,
    showUsageBalance,
    signOut,
    startLocalUser,
    stopRefreshing,
    syncedSettingsLoading,
    syncStatus,
    testAccount,
    testFeed,
    testPost,
    textSize,
    theme,
    trackUsage,
    useReducedMotion,
    waitLoading,
    welcomeSteps
  } from '@slowreader/core'
  import { testCredentials } from '@slowreader/core/test'
  import { onDestroy, type Snippet } from 'svelte'

  import { extensionStore, installingExtension } from '../main/extension.ts'
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
    baseRouter.set({ hash: '', params: {}, route: 'about' })
    lastUsage.set(undefined)
    if (user) await startLocalUser(testCredentials())
    // Waits for the database too, so the app will not reset `busy`
    // and other stores, which the story sets in `oninit()`
    await cleanDatabase()
    // Settings from the database would replace ones from `oninit()`
    if (user) await waitLoading(syncedSettingsLoading)
    // Rows are added by a single action: a story with hundreds of posts
    // will be too slow with an action per row
    if (categories?.length) await addCategory(categories)
    if (accounts?.length) {
      await getTables().accounts.create(
        accounts.map(account => testAccount(account))
      )
    }
    if (feeds?.length) {
      let values = feeds.map(feed => testFeed(feed))
      // Missed avatar loads feed data, which is not a part of the story
      prepareResponses([
        ...values.map((feed): [string, PreparedResponse] => [
          feed.url,
          { status: 404 }
        ]),
        ...responses
      ])
      await addFeed(values)
    }
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
  // Keeps the clock mounted, so the page will not reset it to the real time
  let unbindClock = clock.listen(() => {})

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
    extensionStore.set('https://chromewebstore.google.com/')
    requestMethod.set(undefined)
    busy.set(false)
    clock.set(new Date(2026, 0, 1, 12))
    stopRefreshing()
    refreshStatus.set('start')
    refreshErrors.set([])
    syncStatus.set('synchronized')
    refreshStatistics.set(DEFAULT_REFRESH_STATISTICS)
    mediaStatistics.set(DEFAULT_MEDIA_STATISTICS)
    mediaErrors.set([])
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
    unbindClock()
    busy.set(false)
    baseRouter.set({ hash: '', params: {}, route: 'slow' })
    for (let page of Object.values(pages)) {
      if (page.cache) page.cache = undefined
    }
    useReducedMotion.set(false)
    noStatistics.set(false)
    textSize.set(100)
    postFont.set('default')
    postLineHeight.set('normal')
    customPostFont.set('')
    showSensitiveMedia.set(false)
    openWarnings.set(false)
    showUsageBalance.set(true)
    trackUsage.set(true)
    fastPostsMaxAge.set(604800)
    generalFastReader.set('feed')
    generalSlowReader.set('list')
    nightLock.set({ enabled: false, from: 23, to: 4 })
    cacheMediaReading.set('all')
    autoRefresh.set('never')
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
