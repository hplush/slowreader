<script context="module" lang="ts">
  import FeedsImport from '../../../pages/feeds/import.svelte'

  export const meta = {
    component: FeedsImport,
    title: 'Pages/Feeds/Import'
  }
</script>

<script lang="ts">
  import { Story } from '@storybook/addon-svelte-csf'

  import Scene from '../../scene.svelte'
  import { importMessages, type FeedsByCategory } from '@slowreader/core'

  const loadingFeeds = {
    'https://www.spakhm.com/feed.rss': false,
    'https://blog.appsignal.com/feed.xml': false,
    'https://ciechanow.ski/atom.xml': true,
    'https://hauleth.dev/atom.xml': true
  }

  const feedsByCategory: FeedsByCategory = [
    [
      {
        id: 'general',
        title: 'General'
      },
      [
        {
          categoryId: 'general',
          id: '80s51lSk0dJW_yiMuc93F',
          lastOriginId:
            'https://blog.appsignal.com/2024/07/03/security-best-practices-for-your-nodejs-application.html',
          lastPublishedAt: 1719964800,
          loader: 'atom',
          reading: 'fast',
          title: 'AppSignal',
          url: 'https://blog.appsignal.com/feed.xml'
        },
        {
          categoryId: 'general',
          id: 'Q-3n-RwCGjmG5_saZQ8a4',
          lastOriginId: 'https://ciechanow.ski/airfoil/',
          lastPublishedAt: 1709035200,
          loader: 'rss',
          reading: 'fast',
          title: 'Bartosz Ciechanowski',
          url: 'https://ciechanow.ski/atom.xml'
        }
      ]
    ],
    [
      {
        id: '57EckGuJVC_zcozCTz4E8',
        title: 'custom category'
      },
      [
        {
          categoryId: '57EckGuJVC_zcozCTz4E8',
          id: 'zADgRpwiNMD1zFzS_NMQP',
          lastOriginId: 'https://hauleth.dev/post/who-watches-watchmen-ii/',
          lastPublishedAt: 1699920000,
          loader: 'atom',
          reading: 'fast',
          title: "Hauleth's blog",
          url: 'https://hauleth.dev/atom.xml'
        }
      ]
    ],
    [
      {
        id: 'broken',
        title: 'Broken category'
      },
      [
        {
          categoryId: 'broken',
          id: 'vlx-fJsXckIzQFOlCixaZ',
          lastOriginId: 'entry_d2dc7bb114a94974b34f9786107c3e96',
          lastPublishedAt: 1715476704,
          loader: 'rss',
          reading: 'fast',
          title: 'Slava Akhmechet',
          url: 'https://www.spakhm.com/feed.rss'
        }
      ]
    ]
  ]

  const unloadedFeeds = ['https://a.com/atom', 'https://ferd.ca/feed.rss']
</script>

<Story name="Empty" parameters={{ layout: 'fullscreen' }}>
  <Scene>
    <FeedsImport />
  </Scene>
</Story>

<Story name="Reading" parameters={{ layout: 'fullscreen' }}>
  <Scene {loadingFeeds} {unloadedFeeds}>
    <FeedsImport />
  </Scene>
</Story>

<Story name="Error" parameters={{ layout: 'fullscreen' }}>
  <Scene errors={[importMessages.get().failedParseJSONError]}>
    <FeedsImport />
  </Scene>
</Story>

<Story name="Success" parameters={{ layout: 'fullscreen' }}>
  <Scene {feedsByCategory}>
    <FeedsImport />
  </Scene>
</Story>
