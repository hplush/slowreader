<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import LaterPage from '../../pages/later.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: LaterPage,
    title: 'Pages/Later'
  })

  const NOW = Math.round(Date.now() / 1000)
</script>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[{ id: 'feed', reading: 'slow', title: 'The Mozilla Blog' }]}
    posts={[
      {
        author: {
          feedId: 'feed',
          loader: 'rss',
          title: 'The Mozilla Blog',
          url: 'https://blog.mozilla.org/en/feed/'
        },
        feedId: null,
        full: 'Post saved from the feed',
        later: NOW,
        reading: 'slow',
        title: 'My next chapter with Mastodon'
      },
      {
        author: {
          loader: 'page',
          title: 'example.com',
          url: 'https://example.com/'
        },
        feedId: null,
        full: null,
        later: NOW - 60,
        reading: 'slow',
        title: 'Page without an article',
        url: 'https://example.com/page'
      }
    ]}
    route="later"
  >
    <LaterPage page={pages.later()} />
  </Scene>
</Story>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[{}]} route="later">
    <LaterPage page={pages.later()} />
  </Scene>
</Story>
