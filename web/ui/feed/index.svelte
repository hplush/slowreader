<script lang="ts">
  import {
    type FeedAuthor,
    getFeedAuthor,
    type PreviewPost,
    type ReaderPost,
    type UserPostUrl
  } from '@slowreader/core'

  import FeedPost from './post.svelte'

  let {
    authors,
    autoread = false,
    feedUrl,
    highlight = true,
    posts,
    userPostUrl
  }: {
    authors?: ReadonlyMap<string, FeedAuthor>
    autoread?: boolean
    feedUrl?: string
    highlight?: boolean
    posts: readonly (PreviewPost | ReaderPost)[]
    userPostUrl: UserPostUrl
  } = $props()
</script>

<ul class="feed">
  {#each posts as post (post.id)}
    {@const author = getFeedAuthor(post, authors)}
    <FeedPost
      {author}
      {autoread}
      feedUrl={author?.url ?? feedUrl}
      {highlight}
      {post}
      {userPostUrl}
    />
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
