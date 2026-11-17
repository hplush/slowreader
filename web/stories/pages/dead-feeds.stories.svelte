<script context="module" lang="ts">
  import { pages } from '@slowreader/core'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  import DeadFeedsPage from '../../pages/dead-feeds.svelte'
  import Scene from '../scene.svelte'

  let { Story } = defineMeta({
    component: DeadFeedsPage,
    title: 'Pages/DeadFeeds'
  })

  function date(year: number, month: number): number {
    return Date.UTC(year, month - 1, 15, 12) / 1000
  }
</script>

<Story name="Empty" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene feeds={[{ lastPublishedAt: date(2025, 12) }]} route="deadFeeds">
    <DeadFeedsPage page={pages.deadFeeds()} />
  </Scene>
</Story>

<Story name="List" asChild parameters={{ layout: 'fullscreen' }}>
  <Scene
    feeds={[
      { lastPublishedAt: date(2025, 12), title: 'Alive' },
      {
        lastPublishedAt: date(2019, 3),
        loaderData: '{"failedSince":1,"missing":true}',
        title: 'Company blog'
      },
      {
        loaderData: '{"failedSince":1,"missing":true}',
        title: 'Travel notes'
      },
      { lastPublishedAt: date(2019, 3), title: 'Local-first' },
      {
        lastPublishedAt: date(2023, 6),
        title:
          'Pneumonoultramicroscopicsilicovolcanoconiosis' +
          'Pneumonoultramicroscopicsilicovolcanoconiosis'
      },
      { lastPublishedAt: date(2024, 2), title: 'My friend' },
      { lastPublishedAt: date(2024, 10), title: 'Old blog' }
    ]}
    route="deadFeeds"
  >
    <DeadFeedsPage page={pages.deadFeeds()} />
  </Scene>
</Story>
