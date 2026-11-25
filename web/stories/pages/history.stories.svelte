<script context="module" lang="ts">
  import { pages, type PostValue } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import HistoryPage from '../../pages/history.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: HistoryPage,
    title: 'Pages/History'
  })

  const NOW = Math.round(Date.now() / 1000)

  const READ: Partial<PostValue>[] = [
    {
      feedId: 'blog',
      read: 1,
      reading: 'slow',
      title: 'My next chapter with Mastodon'
    },
    {
      feedId: 'long',
      intro: 'Post without a title has only its text',
      reading: 'slow'
    },
    {
      feedId: 'blog',
      title:
        'Pneumonoultramicroscopicsilicovolcanoconiosis' +
        'Pneumonoultramicroscopicsilicovolcanoconiosis'
    },
    ...Array.from({ length: 49 }, (_, index) => ({
      feedId: 'blog',
      title: `Post ${index + 1}`
    }))
  ]

  const POSTS = READ.map((post, index): Partial<PostValue> => {
    return { read: 2, readAt: NOW - index * 60, ...post }
  })
</script>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene route="history">
    <HistoryPage page={pages.history()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[
      { id: 'blog', title: 'Blog' },
      { id: 'long', title: 'Very long title of the feed about the local-first' }
    ]}
    posts={POSTS}
    route="history"
  >
    <HistoryPage page={pages.history()} />
  </Scene>
</Story>
