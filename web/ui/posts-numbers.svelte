<script lang="ts">
  import { refreshMessages as t } from '@slowreader/core'

  let { fast, slow }: { fast: number; slow: number } = $props()
</script>

<div class="posts-numbers">
  <dl class="posts-numbers_list">
    <dt class="posts-numbers_title is-comfort-mode">{$t.slowPosts}</dt>
    <dd class="posts-numbers_value is-comfort-mode">{slow}</dd>
    <dt class="posts-numbers_title is-non-comfort-mode">{$t.fastPosts}</dt>
    <dd class="posts-numbers_value is-non-comfort-mode">{fast}</dd>
  </dl>
  <div class="posts-numbers_footer">{$t.postsLoaded}</div>
</div>

<style>
  :global {
    .posts-numbers {
      min-width: 15rem;
      text-align: center;
    }

    .posts-numbers_list {
      display: grid;
      grid-template-rows: auto auto;
      grid-template-columns: 1fr 1fr;
      grid-auto-flow: column;
    }

    .posts-numbers_title {
      padding: 0.25rem 1rem 0 1rem;
      background: --tune-background(--gutter);

      &:first-of-type {
        border-radius: var(--base-radius) 0 0 0;
      }

      &:last-of-type {
        border-radius: 0 var(--base-radius) 0 0;
      }
    }

    .posts-numbers_value {
      padding: 0.125rem 1rem 0.75rem 1rem;
      font: var(--counter-font);
      background: --tune-background(--gutter);

      &:first-of-type {
        border-radius: 0 0 0 var(--base-radius);
      }

      &:last-of-type {
        border-radius: 0 0 var(--base-radius) 0;
      }
    }

    .posts-numbers_footer {
      padding: 0.25rem 0 0 0;
      font: var(--secondary-font);
    }
  }
</style>
