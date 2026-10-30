<script lang="ts">
  import { humanizeUrl } from '@slowreader/core'

  import FeedAvatar from './feed-avatar.svelte'

  let {
    avatar,
    avatarRound,
    avatarSize,
    feedId,
    href,
    title,
    url,
    variant = 'main'
  }: {
    avatar: null | string
    avatarRound: boolean
    avatarSize?: 'medium' | 'small'
    feedId: string
    href: string
    title: string
    url?: string
    variant?: 'main' | 'secondary'
  } = $props()
</script>

<div class="feed-link" class:is-secondary={variant === 'secondary'}>
  <a class="feed-link_link" {href}>
    <FeedAvatar {avatar} {feedId} round={avatarRound} size={avatarSize} />
    {#if url}
      <span class="feed-link_names">
        <span class="feed-link_text">{title}</span>
        <span class="feed-link_url">{humanizeUrl(url)}</span>
      </span>
    {:else}
      <span class="feed-link_text">{title}</span>
    {/if}
  </a>
</div>

<style lang="postcss">
  :global {
    .feed-link {
      flex: 1 1 0;
      min-width: 0;
      contain: inline-size;
    }

    .feed-link_link {
      @mixin clickable;

      display: flex;
      gap: 0.5rem;
      align-items: center;
      max-width: 100%;
      height: var(--control-height);
      font: var(--text-font);
      color: var(--text-color);
      border-radius: var(--base-radius);

      .feed-link.is-secondary & {
        height: auto;
        padding: 0;
        font: var(--secondary-font);
        color: var(--secondary-text-color);
      }

      &:hover,
      &:active,
      &:focus-visible {
        text-decoration: underline;
      }

      &:active {
        translate: 0 1px;
      }
    }

    .feed-link_names {
      display: flex;
      flex-direction: column;
      flex-shrink: 1;
      align-self: flex-start;
      min-width: 0;
      color: var(--text-color);
    }

    .feed-link_text {
      flex-shrink: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .feed-link_url {
      overflow: hidden;
      text-overflow: ellipsis;
      font: var(--tertiary-font);
      line-height: 1.4;
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
  }
</style>
