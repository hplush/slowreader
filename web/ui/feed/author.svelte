<script lang="ts">
  import type { LoadedSyncMap, SyncMapStore } from '@logux/client'
  import { type FeedValue, router } from '@slowreader/core'

  import { getPopupHash } from '../../stores/url-router.ts'

  let {
    author
  }: {
    author: LoadedSyncMap<SyncMapStore<FeedValue>>
  } = $props()
</script>

<div class="feed-author">
  <a class="feed-author_link" href={getPopupHash($router, 'feed', $author.url)}>
    {$author.title}
  </a>
</div>

<style lang="postcss">
  :global {
    .feed-author {
      margin-top: -0.5rem;
      margin-bottom: 0.5rem;
    }

    .feed-author_link {
      @mixin clickable;

      font: var(--secondary-font);
      color: var(--secondary-text-color);
      text-decoration: underline;

      &:hover {
        text-decoration: none;
      }
    }
  }
</style>
