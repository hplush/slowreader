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

  type Feed = FeedLoader | FeedValue

  let {
    current,
    id,
    list
  }: {
    current: string | undefined
    id?: string
    list: readonly Feed[]
  } = $props()

  function getHref(feed: Feed): string {
    return getPopupHash(undefined, 'feed', feed.url)
  }

  function getArrow(feed: Feed): string {
    return $isMobile || current === feed.url ? mdiChevronRight : mdiCircleSmall
  }

  function getControls(feed: Feed): string {
    return getPopupId('feed', feed.url)
  }
</script>

<Links {id} {current} {getArrow} {getControls} {getHref} {list}>
  {#snippet item(feed)}
    {feed.title}
  {/snippet}
</Links>
