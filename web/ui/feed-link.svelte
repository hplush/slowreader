<script lang="ts">
  let {
    href,
    title,
    variant = 'main'
  }: { href: string; title: string; variant?: 'main' | 'secondary' } = $props()
</script>

<div class="feed-link" class:is-secondary={variant === 'secondary'}>
  <a class="feed-link_link" {href}>
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
      align-items: center;
      max-width: 100%;
      height: 2rem;
      padding-inline: 0.5rem;
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
