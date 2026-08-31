<script lang="ts" module>
  import {
    type FeedValue,
    getPostPopupParam,
    type Popup,
    popups,
    type PostValue
  } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import PostPopupComponent from '../../popups/post.svelte'
  import imgExample from '../assets/long_width_example.avif'
  import LoadedPopup from '../loaded-popup.svelte'
  import Scene from '../scene.svelte'

  const FEED = {
    id: 'feed',
    reading: 'slow',
    title: 'Example News',
    url: 'https://example.com/news.atom'
  } satisfies Partial<FeedValue>

  const POST = {
    feedId: 'feed',
    full:
      '<p>Example released a big update with <i>XSS</i> in the title.</p>' +
      '<p>The second paragraph to check how the popup renders long text ' +
      'with a few blocks and how the reading column is limited.</p>',
    intro: 'Example released a big update.',
    publishedAt: 1600000000,
    read: 1,
    reading: 'slow',
    title: 'A big changes for Example',
    url: 'https://example.com/news/1'
  } satisfies Partial<PostValue>

  const ORIGIN = getPostPopupParam({
    full: '<p>The post from the feed, which was not added yet.</p>',
    id: 'origin',
    originId: 'origin',
    publishedAt: 1600000000,
    title: 'Post from the feed preview',
    url: 'https://example.com/news/2'
  })

  let { Story } = defineMeta({
    component: PostPopupComponent,
    title: 'Popups/Post'
  })
</script>

<script lang="ts">
  let popup: Popup<'post'> | undefined = $state()

  function open(autoread = false): () => void {
    return () => {
      popup = popups.post(
        getPostPopupParam({ feedId: 'feed', id: 'post-1' }, autoread)
      )
    }
  }
</script>

<Story name="Read" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[FEED]} oninit={open(true)} posts={[POST]}>
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>

<Story name="Origin" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <LoadedPopup popup={popups.post(ORIGIN)}>
      {#snippet loaded(loadedPopup)}
        <PostPopupComponent popup={loadedPopup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    feeds={[FEED]}
    oninit={open()}
    posts={[{ ...POST, media: `[{"type":"image","url":"${imgExample}"}]` }]}
  >
    {#if popup}
      <LoadedPopup {popup}>
        {#snippet loaded(loadedPopup)}
          <PostPopupComponent popup={loadedPopup} />
        {/snippet}
      </LoadedPopup>
    {/if}
  </Scene>
</Story>
