<script context="module" lang="ts">
  import FeedsExport from '../../../pages/feeds/export.svelte'

  export const meta = {
    component: FeedsExport,
    title: 'Pages/Feeds/Export'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../../scene.svelte'
  import {
    importMessages,
    type FeedsByCategory,
    type FeedValue
  } from '@slowreader/core'

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

  // const feedsByCategory: FeedsByCategory = [
  //   [
  //     {
  //       id: 'general',
  //       title: 'General'
  //     },
  //     [
  //       {
  //         categoryId: 'general',
  //         id: '80s51lSk0dJW_yiMuc93F',
  //         lastOriginId:
  //           'https://blog.appsignal.com/2024/07/03/security-best-practices-for-your-nodejs-application.html',
  //         lastPublishedAt: 1719964800,
  //         loader: 'atom',
  //         reading: 'fast',
  //         title: 'AppSignal',
  //         url: 'https://blog.appsignal.com/feed.xml'
  //       },
  //       {
  //         categoryId: 'general',
  //         id: 'Q-3n-RwCGjmG5_saZQ8a4',
  //         lastOriginId: 'https://ciechanow.ski/airfoil/',
  //         lastPublishedAt: 1709035200,
  //         loader: 'rss',
  //         reading: 'fast',
  //         title: 'Bartosz Ciechanowski',
  //         url: 'https://ciechanow.ski/atom.xml'
  //       }
  //     ]
  //   ],
  //   [
  //     {
  //       id: '57EckGuJVC_zcozCTz4E8',
  //       title: 'custom category'
  //     },
  //     [
  //       {
  //         categoryId: '57EckGuJVC_zcozCTz4E8',
  //         id: 'zADgRpwiNMD1zFzS_NMQP',
  //         lastOriginId: 'https://hauleth.dev/post/who-watches-watchmen-ii/',
  //         lastPublishedAt: 1699920000,
  //         loader: 'atom',
  //         reading: 'fast',
  //         title: "Hauleth's blog",
  //         url: 'https://hauleth.dev/atom.xml'
  //       }
  //     ]
  //   ],
  //   [
  //     {
  //       id: 'broken',
  //       title: 'Broken category'
  //     },
  //     [
  //       {
  //         categoryId: 'broken',
  //         id: 'vlx-fJsXckIzQFOlCixaZ',
  //         lastOriginId: 'entry_d2dc7bb114a94974b34f9786107c3e96',
  //         lastPublishedAt: 1715476704,
  //         loader: 'rss',
  //         reading: 'fast',
  //         title: 'Slava Akhmechet',
  //         url: 'https://www.spakhm.com/feed.rss'
  //       }
  //     ]
  //   ]
  // ]
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
