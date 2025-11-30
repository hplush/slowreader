<script context="module" lang="ts">
  import {
    changePost,
    needWelcome,
    pages,
    type PostValue
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FeedsPage from '../../pages/feeds/index.svelte'
  import Scene from '../scene.svelte'

  const POSTS = [
    {
      feedId: 'feed',
      reading: 'slow',
      title: 'My next chapter with Mastodon'
    },
    { feedId: 'feed', reading: 'slow' },
    {
      feedId: 'feed',
      reading: 'slow',
      title: 'The Future is Ours to Build - Together'
    },
    { feedId: 'feed', full: '', intro: '', reading: 'slow', title: '' },
    {
      feedId: 'feed',
      reading: 'slow',
      title:
        'Linux Patches Improve Intel Nested VM Memory Performance Up To ~2353x In Synthetic Test'
    },
    {
      feedId: 'feed',
      reading: 'slow',
      title: '6000000000000000000000000000000000000000000000000000000000000'
    }
  ] satisfies Partial<PostValue>[]

  function multiply<Value>(array: Value[], count: number): Value[] {
    let result: Value[] = []
    for (let i = 0; i < count; i++) {
      result.push(...array)
    }
    return result
  }

  let { Story } = defineMeta({
    component: FeedsPage,
    title: 'Pages/Feeds'
  })
</script>

<Story name="Slow Welcome" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      needWelcome.set(true)
    }}
    route="slow"
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="Fast Welcome" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    oninit={() => {
      needWelcome.set(true)
    }}
    route="fast"
  >
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Slow Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[{}]} route="slow">
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="Fast Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[{}]} route="fast">
    <FeedsPage page={pages.fast()} />
  </Scene>
</Story>

<Story name="Loading" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow' }]}
    oninit={() => {
      setTimeout(() => {
        pages.slow().posts.get()?.loading.set(true)
      }, 100)
      setTimeout(() => {
        pages.slow().posts.get()?.loading.set(true)
      }, 500)
    }}
    posts={[{ feedId: 'feed', reading: 'slow' }]}
    route={{ params: { feed: 'feed' }, route: 'slow' }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow' }]}
    oninit={() => {
      setTimeout(() => {
        changePost('post-2', { read: true })
        changePost('post-3', { read: true })
      }, 1)
    }}
    posts={POSTS}
    route={{ params: { feed: 'feed' }, route: 'slow' }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="List Openned" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow' }]}
    posts={POSTS}
    route={{
      hash: 'post=read:post-1',
      params: { feed: 'feed' },
      route: 'slow'
    }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>

<Story name="List Pagination" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow' }]}
    posts={multiply(POSTS, 50)}
    route={{
      params: { feed: 'feed' },
      route: 'slow'
    }}
  >
    <FeedsPage page={pages.slow()} />
  </Scene>
</Story>
