<script context="module" lang="ts">
  import FeedsCategories from '../../../pages/feeds/categories.svelte'

  export const meta = {
    component: FeedsCategories,
    title: 'Pages/Feeds/Categories'
  }
</script>

<script lang="ts">
  import type { FeedValue } from '@slowreader/core'
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../../scene.svelte'

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

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[]}>
    <FeedsCategories feedId={undefined} />
  </Scene>
</Story>

<Story name="List" parameters={{ layout: 'fullscreen' }}>
  <Scene categories={[{ id: 'code', title: 'Code' }]} feeds={FEEDS}>
    <FeedsCategories feedId={undefined} />
  </Scene>
</Story>

<Story name="Feed Loading" parameters={{ layout: 'fullscreen' }}>
  <Scene
    categories={[{ id: 'code', title: 'Code' }]}
    feeds={FEEDS}
    responses={{ 'https://example.com/news.atom': { loading: true } }}
  >
    <FeedsCategories feedId="a" />
  </Scene>
</Story>
