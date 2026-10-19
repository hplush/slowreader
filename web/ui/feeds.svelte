<script lang="ts">
  import { mdiChevronRight } from '@mdi/js'
  import {
    type FeedLoader,
    type FeedValue,
    getPopupId,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import FeedAvatar from './feed-avatar.svelte'
  import Links from './links.svelte'

  type FeedLike = FeedLoader | FeedValue

  let {
    current,
    hints,
    id,
    list
  }: {
    current: string | undefined
    hints?: Record<string, string>
    id?: string
    list: readonly FeedLike[]
  } = $props()

  let links = $derived(
    list.map(feed => ({
      controls: getPopupId('feed', feed.url),
      hint: hints?.[feed.url],
      href: getPopupHash($router, 'feed', feed.url),
      id: feed.url,
      item: feed,
      mark: mdiChevronRight
    }))
  )
</script>

<Links {id} anchor="feed" {current} {links}>
  {#snippet item(feed)}
    <span class="feeds_title">
      {#if 'id' in feed}
        <FeedAvatar avatar={feed.avatar} feedId={feed.id} />
      {/if}
      {feed.title}
    </span>
  {/snippet}
</Links>

<style>
  :global {
    .feeds_title {
      display: flex;
      flex-grow: 1;
      gap: 0.5rem;
      flex-shrink: 1;
      align-items: center;
      min-width: 0;
    }
  }
</style>
