<script lang="ts">
  import { type RefreshError, router } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'

  let { errors }: { errors: readonly RefreshError[] } = $props()
</script>

<ul class="feed-errors">
  {#each errors as { error, feed } (feed.id)}
    <li class="feed-errors_item">
      <a
        class="feed-errors_feed"
        href={getPopupHash($router, 'feed', feed.url)}
      >
        {feed.title}
      </a>
      <div class="feed-errors_text">
        {error}
      </div>
    </li>
  {/each}
</ul>

<style>
  :global {
    .feed-errors {
      width: stretch;
      list-style: none;
      border: 0.125rem solid --tune-background(--note);
      border-radius: var(--base-radius);

      @mixin background var(--note-dangerous-background);
    }

    .feed-errors_item {
      &:not(:first-child) {
        border-top: 0.125rem solid --tune-background(--note);
      }
    }

    .feed-errors_feed {
      display: block;
      padding: 0.625rem var(--control-padding) 0 var(--control-padding);
      font: var(--control-secondary-font);
      color: currentcolor;
      overflow-wrap: anywhere;
      border-radius: var(--base-radius);

      &:hover,
      &:focus-visible,
      &:active {
        text-decoration: none;
      }

      &:active {
        translate: 0 1px;
      }
    }

    .feed-errors_text {
      padding: 0 var(--control-padding) 0.625rem var(--control-padding);
    }
  }
</style>
