<script lang="ts">
  import type { PostAuthor, PostValue } from '@slowreader/core'

  import FeedPost from './post.svelte'

  let {
    authors,
    posts
  }: {
    authors?: ReadonlyMap<string, PostAuthor>
    posts: readonly PostValue[]
  } = $props()
</script>

<ul class="feed">
  {#each posts as post (post.id)}
    <FeedPost author={authors?.get(post.feedId)} {post} />
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
