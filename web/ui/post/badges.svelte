<script lang="ts">
  import { type PostBadge, postMessages as t } from '@slowreader/core'

  let { badges }: { badges: PostBadge[] } = $props()
</script>

<div class="post-badges">
  {#each badges as badge (badge.type)}
    <span
      class="post-badges_item"
      title={badge.position > 1
        ? $t.threadPartLabel(badge)
        : $t.threadLabel(badge)}
    >
      {$t.thread(badge)}
    </span>
  {/each}
</div>

<style lang="postcss">
  :global {
    .post-badges {
      display: flex;
      gap: 0.25rem;
    }

    .post-badges_item {
      display: flex;
      align-items: center;
      padding: 0.25rem 0.5rem;
      font: var(--badge-font);
      color: var(--secondary-text-color);
      background: --tune-background(--gutter);
      border-radius: 1rem;
    }
  }
</style>
