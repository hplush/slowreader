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
    {
      categoryId: 'design',
      title: 'Smashing Magazine — For Web Designers And Developers'
    },
    { categoryId: 'unknown', title: 'Broken category' },
    { reading: 'slow', title: 'My friend' }
  ]

  const CATEGORIES = [
    { id: 'code', title: 'Code' },
    { id: 'empty', title: 'Empty' },
    { id: 'design', title: 'Design and typography' },
    {
      id: 'long',
      title:
        'Pneumonoultramicroscopicsilicovolcanoconiosis' +
        'Pneumonoultramicroscopicsilicovolcanoconiosis'
    }
  ]
</script>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[]}>
    <CategoriesPage page={pages.categories()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={CATEGORIES}
    feeds={FEEDS}
    oninit={() => {
      pages.categories().toggle('code')
    }}
  >
    <CategoriesPage page={pages.categories()} />
  </Scene>
</Story>

<Story
  name="List Mobile"
  asChild
  globals={{ viewport: { value: 'mobile2' } }}
  parameters={{ layout: 'fullscreen' }}
>
  <Scene
    categories={CATEGORIES}
    feeds={FEEDS}
    oninit={() => {
      pages.categories().toggle('code')
      pages.categories().toggle('empty')
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
