<script context="module" lang="ts">
  import { popups } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FeedPopupComponent from '../../popups/feed.svelte'
  import LoadedPopup from '../loaded-popup.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: FeedPopupComponent,
    title: 'Popups/Feed'
  })

  const ICON =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
        '<rect width="16" height="16" fill="#0060df"/></svg>'
    )

  const ATOM = {
    body: `<?xml version="1.0" encoding="utf-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <title>Example News</title>
      <icon>${ICON}</icon>
      <updated>2021-01-01T00:00:00Z</updated>
      <id>https://example.com/news.atom</id>
      <entry>
        <title>A big changes for Example with <i>XSS</i></title>
        <link href="https://example.com/news/1" />
        <id>https://example.com/news/1</id>
        <updated>2021-01-01T00:00:00Z</updated>
      </entry>
      <entry>
        <title>Other news</title>
        <link href="https://example.com/news/2" />
        <id>https://example.com/news/2</id>
        <updated>2021-01-01T00:00:00Z</updated>
      </entry>
    </feed>`,
    contentType: 'application/atom+xml'
  }
</script>

<Story name="New" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    responses={[
      ['https://example.com/news.atom', ATOM],
      [ICON, { contentType: 'image/svg+xml' }]
    ]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Added" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[
      {
        avatar: ICON,
        url: 'https://example.com/news.atom'
      }
    ]}
    responses={[['https://example.com/news.atom', ATOM]]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Added Loading" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ url: 'https://example.com/news.atom' }]}
    responses={[['https://example.com/news.atom', { loading: true }]]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story name="Added Fast" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[
      {
        avatar:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mPQmmtPEmIY1TCqYfhqAAA1jwYQh1fDuAAAAABJRU5ErkJggg==',
        reading: 'fast',
        url: 'https://example.com/news.atom'
      }
    ]}
    responses={[['https://example.com/news.atom', ATOM]]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="New Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene responses={[['https://example.com/news.atom', ATOM]]}>
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>

<Story
  name="Added Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    feeds={[{ reading: 'fast', url: 'https://example.com/news.atom' }]}
    responses={[['https://example.com/news.atom', ATOM]]}
  >
    <LoadedPopup popup={popups.feed('https://example.com/news.atom')}>
      {#snippet loaded(popup)}
        <FeedPopupComponent {popup} />
      {/snippet}
    </LoadedPopup>
  </Scene>
</Story>
