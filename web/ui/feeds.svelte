<script lang="ts">
  import { mdiChevronRight, mdiCircleSmall } from '@mdi/js'
  import {
    type FeedLoader,
    type FeedValue,
    getPopupId,
    layoutType
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Links from './links.svelte'

  type FeedLike = FeedLoader | FeedValue

  let {
    current,
    id,
    list
  }: {
    current: string | undefined
    id?: string
    list: readonly FeedLike[]
  } = $props()

  let links = $derived(
    list.map(feed => ({
      arrow:
        $layoutType === 'mobile' || current === feed.url
          ? mdiChevronRight
          : mdiCircleSmall,
      controls: getPopupId('feed', feed.url),
      href: getPopupHash(undefined, 'feed', feed.url),
      item: feed
    }))
  )
</script>

<Links {id} current={list.find(i => i.url === current)} {links}>
  {#snippet item(feed)}
    {feed.title}
  {/snippet}
</Links>
