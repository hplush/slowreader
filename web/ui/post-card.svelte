<script lang="ts">
  import {
    type FeedValue,
    type FilterAction,
    type OriginPost,
    commonMessages as t
  } from '@slowreader/core'

  import Button from './button.svelte'
  import Card from './card.svelte'
  import FormattedText from './formatted-text.svelte'

  export let post: OriginPost
  export let author: FeedValue | undefined = undefined
  export let action: FilterAction | undefined = undefined
  export let open: string | undefined = undefined
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
    {#if open}
      <Button href={open} secondary>{$t.openPost}</Button>
    {/if}
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
