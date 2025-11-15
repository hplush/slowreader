<script context="module" lang="ts">
  import { type FeedValue, needWelcome, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FeedsByCategoriesPage from '../../pages/feeds-by-categories.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: FeedsByCategoriesPage,
    title: 'Pages/FeedsByCategories'
  })

  const FEEDS: Partial<FeedValue>[] = [
    {
      categoryId: 'code',
      id: 'a',
      loader: 'atom',
      title: 'Local-first',
      url: 'https://example.com/news.atom'
    },
    {
      categoryId: 'code',
      title:
        'Pneumonoultramicroscopicsilicovolcanoconiosis' +
        'Pneumonoultramicroscopicsilicovolcanoconiosis'
    },
    { categoryId: 'unknown', title: 'Broken category' },
    { title: 'My friend' }
  ]
</script>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[]}
    oninit={() => {
      needWelcome.set(true)
    }}
  >
    <FeedsByCategoriesPage page={pages.feedsByCategories()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene categories={[{ id: 'code', title: 'Code' }]} feeds={FEEDS}>
    <FeedsByCategoriesPage page={pages.feedsByCategories()} />
  </Scene>
</Story>
