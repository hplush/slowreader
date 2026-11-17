<script context="module" lang="ts">
  import { type FeedValue, pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import CategoriesPage from '../../pages/categories.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: CategoriesPage,
    title: 'Pages/Categories'
  })

  const FEEDS: Partial<FeedValue>[] = [
    {
      avatar:
        'data:image/svg+xml,' +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
            '<circle cx="8" cy="8" r="8" fill="#e66000"/></svg>'
        ),
      categoryId: 'code',
      id: 'a',
      loader: 'atom',
      reading: 'slow',
      title: 'Local-first',
      url: 'https://example.com/news.atom'
    },
    {
      categoryId: 'code',
      title:
        'Pneumonoultramicroscopicsilicovolcanoconiosis' +
        'Pneumonoultramicroscopicsilicovolcanoconiosis'
    },
    { categoryId: 'long', title: 'Long category' },
    { categoryId: 'unknown', title: 'Broken category' },
    { reading: 'slow', title: 'My friend' }
  ]
</script>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[]}>
    <CategoriesPage page={pages.categories()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={[
      { id: 'code', title: 'Code' },
      { id: 'empty', title: 'Empty' },
      {
        id: 'long',
        title:
          'Pneumonoultramicroscopicsilicovolcanoconiosis' +
          'Pneumonoultramicroscopicsilicovolcanoconiosis'
      }
    ]}
    feeds={FEEDS}
    oninit={() => {
      pages.categories().toggle('code')
    }}
  >
    <CategoriesPage page={pages.categories()} />
  </Scene>
</Story>

<Story name="Syncing Follows" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={[{ id: 'code', title: 'Code' }]}
    feeds={FEEDS}
    oninit={() => {
      pages.categories().sync.set('syncing')
    }}
  >
    <CategoriesPage page={pages.categories()} />
  </Scene>
</Story>
