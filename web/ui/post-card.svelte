<script lang="ts">
  import {
    type FeedValue,
    type FilterAction,
    getPostContent,
    getPostIntro,
    type OriginPost,
    commonMessages as t
  } from '@slowreader/core'

  import Button from './button.svelte'
  import Card from './card.svelte'
  import FormattedText from './formatted-text.svelte'

  let {
    action,
    author,
    full = false,
    open,
    post
  }: {
    action?: FilterAction
    author?: FeedValue
    full?: boolean
    open?: string
    post: OriginPost
  } = $props()
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
      <h1 class="post-card_title">
        {#if post.url}
          <a href={post.url} rel="noopener" target="_blank">
            {post.title}
          </a>
        {:else}
          {post.title}
        {/if}
      </h1>
    {/if}
    {#if full}
      <FormattedText html={getPostContent(post)} />
    {:else}
      <FormattedText html={getPostIntro(post)} />
    {/if}
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

  .post-card_title {
    margin-bottom: 0.5em;
    font: var(--card-title-font);
    text-wrap: pretty;
  }

  .post-card_title a {
    color: currentcolor;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
</style>
