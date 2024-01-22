<script lang="ts">
  /* We escape and have XSS tests */
  /* eslint svelte/no-at-html-tags: "off" */

  import {
    type FeedValue,
    type FilterAction,
    type OriginPost,
    sanitizeHTML
  } from '@slowreader/core'

  import Card from './card.svelte'

  export let post: OriginPost
  export let author: FeedValue | undefined = undefined
  export let action: FilterAction | undefined = undefined
</script>

<Card>
  <div
    class="post-card"
    class:is-deleted={action === 'delete'}
    class:is-slow-theme={action === 'slow'}
  >
    {#if author}
      {author.title}:
    {/if}
    {#if post.title}
      <h1>
        {#if post.url}
          <a href={post.url}>{post.title}</a>
        {:else}
          {post.title}
        {/if}
      </h1>
    {/if}
    {@html sanitizeHTML(post.intro ?? post.full ?? '')}
  </div>
</Card>

<style>
  .post-card.is-slow-theme {
    font-weight: bold;
  }

  .post-card.is-deleted {
    opacity: 80%;
  }
</style>
