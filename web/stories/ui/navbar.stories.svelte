<script lang="ts" module>
  import {
    type CategoryValue,
    closedCategories,
    DEFAULT_REFRESH_STATISTICS,
    type FeedValue,
    type PostValue,
    refreshStatistics,
    refreshStatus,
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
    { categoryId: 'browsers', id: 'mozilla', title: 'The Mozilla Blog' },
    { categoryId: 'socials', id: 'mastadon', title: 'Mastodon Blog' },
    { categoryId: 'socials', id: 'bluesky', title: 'Bluesky' }
  ] satisfies Partial<FeedValue>[]
  const POSTS = [
    { feedId: 'mozilla', reading: 'slow', title: 'New Firefox Release' },
    { feedId: 'mastadon', reading: 'slow', title: 'Trunk & Tidbits' },
    { feedId: 'bluesky', reading: 'slow', title: 'Progress Update' }
  ] satisfies Partial<PostValue>[]
</script>

<Story name="Light Slow" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene categories={CATEGORIES} feeds={FEEDS} posts={POSTS}>
    <Navbar />
  </Scene>
</Story>

<Story name="Light Fast" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('wait')
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
    }}
    posts={POSTS}
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Sending" asChild>
  <Scene
    oninit={() => {
      syncStatus.set('sending')
    }}
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
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Add" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      refreshStatus.set('done')
    }}
    route="add"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Refreshing" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
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
        processedFeeds: 3,
        totalFeeds: 4
      })
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
      syncStatus.set('disconnected')
    }}
    route="fast"
  >
    <Navbar />
  </Scene>
</Story>

<Story name="Scroll" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      syncStatus.set('disconnected')
    }}
    route="add"
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
  <Scene>
    <Navbar />
  </Scene>
</Story>

<Story
  name="Tablet"
  asChild
  globals={{ viewport: { value: 'tablet' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene>
    <Navbar />
  </Scene>
</Story>
