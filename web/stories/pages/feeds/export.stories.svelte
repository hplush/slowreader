<script context="module" lang="ts">
  import type { FeedValue } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import FeedsExport from '../../../pages/feeds/export.svelte'
  import Scene from '../../scene.svelte'

  let { Story } = defineMeta({
    component: FeedsExport,
    title: 'Pages/Feeds/Export'
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

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <FeedsExport formatId={undefined} />
  </Scene>
</Story>

<Story name="OPML" parameters={{ layout: 'fullscreen' }}>
  <Scene categories={[{ id: 'code', title: 'Code' }]} feeds={FEEDS}>
    <FeedsExport formatId={'opml'} />
  </Scene>
</Story>

<Story name="Internal" parameters={{ layout: 'fullscreen' }}>
  <Scene categories={[{ id: 'code', title: 'Code' }]} feeds={FEEDS}>
    <FeedsExport formatId={'internal'} />
  </Scene>
</Story>
