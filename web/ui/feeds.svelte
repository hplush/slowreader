<script lang="ts">
  import { mdiChevronRight, mdiCircleSmall } from '@mdi/js'
  import {
    type FeedLoader,
    type FeedValue,
    getPopupId,
    isMobile
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

  function getHref(feed: FeedLike): string {
    return getPopupHash(undefined, 'feed', feed.url)
  }

  function getArrow(feed: FeedLike): string {
    return $isMobile || current === feed.url ? mdiChevronRight : mdiCircleSmall
  }

  function getControls(feed: FeedLike): string {
    return getPopupId('feed', feed.url)
  }

  function getCurrent(feed: FeedLike): boolean {
    return current === feed.url
  }
</script>

<Links {id} {getArrow} {getControls} {getCurrent} {getHref} {list}>
  {#snippet item(feed)}
    {feed.title}
  {/snippet}
</Links>
