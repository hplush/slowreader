<script lang="ts">
  import FeedAvatar from './feed-avatar.svelte'

  let {
    avatar,
    avatarRound,
    avatarSize,
    feedId,
    href,
    title,
    variant = 'main'
  }: {
    avatar: null | string
    avatarRound: boolean
    avatarSize?: 'medium' | 'small'
    feedId: string
    href: string
    title: string
    variant?: 'main' | 'secondary'
  } = $props()
</script>

<div class="feed-link" class:is-secondary={variant === 'secondary'}>
  <a class="feed-link_link" {href}>
    <FeedAvatar {avatar} {feedId} round={avatarRound} size={avatarSize} />
    <span class="feed-link_text">{title}</span>
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

    .feed-link_text {
      flex-shrink: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
