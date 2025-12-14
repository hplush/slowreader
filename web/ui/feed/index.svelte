<script lang="ts">
  import type { LoadedSyncMap, SyncMapStore } from '@logux/client'
  import type { FeedValue, PostValue } from '@slowreader/core'

  import FeedPost from './post.svelte'

  let {
    authors,
    posts
  }: {
    authors?: Map<string, LoadedSyncMap<SyncMapStore<FeedValue>>>
    posts: readonly LoadedSyncMap<SyncMapStore<PostValue>>[]
  } = $props()
</script>

<ul class="feed">
  {#each posts as post (post.get().id)}
    <FeedPost author={authors?.get(post.get().feedId)} {post} />
  {/each}
</ul>

<style>
  :global {
    .feed {
      width: stretch;
      list-style: none;
    }
  }
</style>
