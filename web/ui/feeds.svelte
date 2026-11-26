<script lang="ts">
  import { mdiChevronRight } from '@mdi/js'
  import {
    type FeedLoader,
    type FeedStats as FeedStatsValue,
    type FeedValue,
    getPopupId,
    hasPersonAvatar,
    humanizeUrl,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import FeedAvatar from './feed-avatar.svelte'
  import FeedStats from './feed-stats.svelte'
  import Links from './links.svelte'

  type FeedLike = FeedLoader | FeedValue

  let {
    avatars,
    current,
    handles,
    hints,
    id,
    list,
    readings,
    stats,
    variant
  }: {
    avatars?: Record<string, string>
    current: string | undefined
    handles?: boolean
    hints?: Record<string, string>
    id?: string
    list: readonly FeedLike[]
    readings?: Record<string, 'fast' | 'slow'>
    stats?: ReadonlyMap<string, FeedStatsValue>
    variant?: 'dangerous'
  } = $props()

  let links = $derived(
    list.map(feed => ({
      controls: getPopupId('feed', feed.url),
      hint: hints?.[feed.url],
      href: getPopupHash($router, 'feed', feed.url),
      id: feed.url,
      item: feed,
      mark: mdiChevronRight,
      reading: readings?.[feed.url],
      variant
    }))
  )
</script>

<Links {id} anchor="feed" {current} {links}>
  {#snippet item(feed)}
    <span class="feeds_title">
      {#if 'id' in feed}
        <FeedAvatar
          avatar={feed.avatar}
          feedId={feed.id}
          round={hasPersonAvatar(feed.loader)}
        />
      {:else if avatars}
        <FeedAvatar
          avatar={avatars[feed.url]}
          round={hasPersonAvatar(feed.name)}
        />
      {/if}
      {#if handles && 'id' in feed}
        <span class="feeds_names">
          <span>{feed.title}</span>
          <span class="feeds_handle">{humanizeUrl(feed.url, feed.loader)}</span>
        </span>
      {:else}
        {feed.title}
      {/if}
    </span>
    {#if 'id' in feed && stats?.has(feed.id)}
      <span class="feeds_stats">
        <FeedStats stats={stats.get(feed.id)!} variant="stacked" />
      </span>
    {/if}
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

    .feeds_names {
      display: flex;
      flex: 1 1 0;
      flex-direction: column;
      gap: 0.125rem;
      min-width: 0;

      /* Second line must not make the row taller than with only the title */
      margin-block: -0.5rem;
      contain: inline-size;
    }

    .feeds_handle {
      overflow: hidden;
      text-overflow: ellipsis;
      font: var(--tertiary-font);
      line-height: 1.4;
      color: var(--secondary-text-color);
      white-space: nowrap;
    }

    .feeds_stats {
      display: flex;
      flex-shrink: 0;
      margin-inline-start: 0.5rem;
    }
  }
</style>
