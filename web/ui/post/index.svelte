<script lang="ts">
  import { mdiPuzzleOutline } from '@mdi/js'
  import {
    addMediaSizes,
    type OriginPost,
    type PostValue,
    postMessages as t
  } from '@slowreader/core'

  import FormattedText from '../formatted-text.svelte'
  import Note from '../note.svelte'
  import PostByline from './byline.svelte'
  import PostMedia from './media.svelte'
  import PostPreview from './preview.svelte'
  import PostQuote from './quote.svelte'
  import PostWarning from './warning.svelte'

  let {
    post,
    repostHref
  }: { post: OriginPost | PostValue; repostHref?: string } = $props()
</script>

<div class="post">
  <PostByline author={post.author} {repostHref} repostedBy={post.repostedBy} />
  {#if post.title}
    <h1 class="post_title">
      {#if post.url}
        <a class="post_title-url" href={post.url} target="_blank">
          <FormattedText html={post.title} scroll={false} />
        </a>
      {:else}
        <FormattedText html={post.title} scroll={false} />
      {/if}
    </h1>
  {/if}

  {#if post.replied && !post.replied.missing}
    <div class="post_replied">
      <PostQuote caption={$t.replyingTo} full linked quoted={post.replied} />
    </div>
  {/if}
  <PostWarning warning={post.warning}>
    {#if post.full}
      <FormattedText html={post.full} />
    {:else if post.intro}
      <FormattedText html={post.intro} />
    {/if}

    <PostMedia media={addMediaSizes(post.media, post.mediaSizes)} />

    {#if post.quoted}
      <PostQuote full linked quoted={post.quoted} />
    {/if}
    {#if post.preview}
      <PostPreview preview={post.preview} />
    {/if}
  </PostWarning>

  {#if post.unsupported}
    <div class="post_unsupported">
      <Note icon={mdiPuzzleOutline} variant="neutral">{$t.unsupported}</Note>
    </div>
  {/if}
</div>

<style>
  :global {
    .post {
      display: flex;
      flex-shrink: 1;
      flex-direction: column;
      width: stretch;
    }

    .post_title {
      margin-bottom: 0.75rem;
      font: var(--post-title-font);
    }

    .post_title-url {
      color: currentcolor;
      text-decoration: none;

      &:hover,
      &:active,
      &:focus-visible {
        text-decoration: underline;
      }

      &:focus-visible {
        border-radius: var(--base-radius);
      }
    }

    .post_replied {
      margin-bottom: 0.625rem;
    }

    .post_unsupported {
      margin-top: 0.625rem;
    }
  }
</style>
