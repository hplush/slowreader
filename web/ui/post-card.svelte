<script lang="ts">
  import type { FeedValue, FilterAction, OriginPost } from '@slowreader/core'

  import Card from './card.svelte'
  import FormattedText from './formatted-text.svelte'

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
    <FormattedText html={post.intro ?? post.full ?? ''} />
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
