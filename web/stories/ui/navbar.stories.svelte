<script lang="ts" module>
  import {
    cacheMediaReading,
    type CategoryValue,
    closedCategories,
    DEFAULT_REFRESH_STATISTICS,
    type FeedValue,
    getTables,
    mediaStatistics,
    type PostValue,
    refreshStatistics,
    refreshStatus,
    showReadFeeds,
    showUsageBalance,
    syncStatus
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import Navbar from '../../ui/navbar/index.svelte'
  import Scene from '../scene.svelte'
  import Section from '../section.svelte'

  let { Story } = defineMeta({
    component: Navbar,
    title: 'UI/Navbar'
  })

  const CATEGORIES = [
    { id: 'browsers', title: 'Browsers' },
    { id: 'socials', title: 'Social Medias' }
  ] satisfies Partial<CategoryValue>[]
  const FEEDS = [
    {
      avatar:
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
            '<circle cx="8" cy="8" r="8" fill="#e66000"/></svg>'
        ),
      categoryId: 'browsers',
      id: 'mozilla',
      title: 'The Mozilla Blog'
    },
    {
      categoryId: 'browsers',
      id: 'webkit',
      reading: 'slow',
      title: 'WebKit Blog'
    },
    {
      avatar: 'https://NO_SERVER/broken.png',
      categoryId: 'socials',
      id: 'mastadon',
      title: 'Mastodon Blog'
    },
    { categoryId: 'socials', id: 'bluesky', title: 'Bluesky' }
  ] satisfies Partial<FeedValue>[]
  function addUsage(fast: number, slow: number): void {
    let now = new Date(2026, 0, 1, 12).getTime()
    let minute = 60 * 1000
    void getTables().usages.create([
      {
        from: now - 120 * minute,
        to: now - (120 - slow) * minute,
        type: 'slow'
      },
      { from: now - 60 * minute, to: now - (60 - fast) * minute, type: 'fast' }
    ])
  }

  const POSTS = [
    { feedId: 'mozilla', reading: 'slow', title: 'New Firefox Release' },
    { feedId: 'mastadon', reading: 'slow', title: 'Trunk & Tidbits' },
    { feedId: 'bluesky', reading: 'slow', title: 'Progress Update' }
  ] satisfies Partial<PostValue>[]
</script>

<Story name="Light Slow" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={CATEGORIES}
    feeds={FEEDS}
    oninit={() => {
      showReadFeeds.set(true)
    }}
    posts={POSTS}
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Light Fast" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('wait')
      addUsage(50, 10)
    }}
    route="fast"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Connecting" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={CATEGORIES}
    feeds={FEEDS}
    oninit={() => {
      closedCategories.set(new Set(['socials']))
      syncStatus.set('connectingAfterWait')
    }}
    posts={POSTS}
    route={{ params: { category: 'browsers' }, route: 'slow' }}
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Synchronized" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={CATEGORIES}
    feeds={FEEDS}
    oninit={() => {
      syncStatus.set('synchronizedAfterWait')
      refreshStatus.set('other')
      showUsageBalance.set(false)
    }}
    posts={POSTS}
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Sync Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={CATEGORIES}
    feeds={FEEDS}
    oninit={() => {
      syncStatus.set('error')
    }}
    posts={POSTS}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Add" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      refreshStatus.set('done')
      syncStatus.set('disconnected')
    }}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Refreshing" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('sending')
      refreshStatus.set('refreshing')
      refreshStatistics.set({
        ...DEFAULT_REFRESH_STATISTICS,
        processedFeeds: 2,
        totalFeeds: 4
      })
    }}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>

<Story
  name="Refreshing Only Posts"
  asChild
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      cacheMediaReading.set('none')
      refreshStatus.set('refreshing')
      refreshStatistics.set({
        ...DEFAULT_REFRESH_STATISTICS,
        processedFeeds: 2,
        totalFeeds: 4
      })
    }}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Refreshing Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      refreshStatus.set('refreshingError')
      refreshStatistics.set({
        ...DEFAULT_REFRESH_STATISTICS,
        errorFeeds: 1,
        errorRequests: 1,
        processedFeeds: 4,
        totalFeeds: 4
      })
      mediaStatistics.set({ done: 1, failed: 0, total: 3 })
    }}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Refresh Error" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      refreshStatus.set('error')
      refreshStatistics.set({
        ...DEFAULT_REFRESH_STATISTICS,
        errorFeeds: 1,
        errorRequests: 1
      })
    }}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>

<Story
  name="Dark Light"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Dark Fast"
  asChild
  parameters={{ layout: 'fullscreen', themes: { themeOverride: 'dark' } }}
>
  <Scene
    oninit={() => {
      syncStatus.set('receiving')
    }}
    route="fast"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Scroll" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={CATEGORIES}
    feeds={[
      ...FEEDS,
      ...Array.from({ length: 10 }, (_, i) => ({
        categoryId: 'socials',
        id: `blog${i}`,
        title: `Blog ${i + 1}`
      }))
    ]}
    oninit={() => {
      syncStatus.set('sending')
    }}
    posts={[
      ...POSTS,
      ...Array.from({ length: 10 }, (_, i) => ({
        feedId: `blog${i}`,
        reading: 'slow' as const,
        title: `Post ${i + 1}`
      }))
    ]}
  >
    <Section height={300}>
      <Navbar />
    </Section>
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      addUsage(30, 20)
    }}
  >
    <Navbar />
  </Scene>
</Story>

<Story
  name="Tablet"
  asChild
  globals={{ viewport: { value: 'tablet' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    oninit={() => {
      showUsageBalance.set(false)
    }}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>
