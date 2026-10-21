<script lang="ts">
  import {
    type FeedAuthor,
    getFeedAuthor,
    type PreviewPost,
    type ReaderPost
  } from '@slowreader/core'

  import FeedPost from './post.svelte'

  let {
    authors,
    feedUrl,
    posts
  }: {
    authors?: ReadonlyMap<string, FeedAuthor>
    feedUrl?: string
    posts: readonly (PreviewPost | ReaderPost)[]
  } = $props()
</script>

<ul class="feed">
  {#each posts as post (post.id)}
    {@const author = getFeedAuthor(post, authors)}
    <FeedPost {author} feedUrl={author?.url ?? feedUrl} {post} />
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
