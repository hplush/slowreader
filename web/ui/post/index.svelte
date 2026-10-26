<script lang="ts">
  import { mdiPuzzleOutline } from '@mdi/js'
  import {
    addMediaSizes,
    getMediaOutsideText,
    type OriginPost,
    type PostValue,
    sanitizeDOM,
    postMessages as t,
    type UserPostUrl
  } from '@slowreader/core'

  import FormattedText from '../formatted-text.svelte'
  import Note from '../note.svelte'
  import Stack from '../stack.svelte'
  import PostByline from './byline.svelte'
  import PostMedia from './media.svelte'
  import PostPoll from './poll.svelte'
  import PostPreview from './preview.svelte'
  import PostQuote from './quote.svelte'
  import PostWarning from './warning.svelte'

  let {
    post,
    repostHref,
    userPostUrl
  }: {
    post: OriginPost | PostValue
    repostHref?: string
    userPostUrl: UserPostUrl
  } = $props()

  let text = $derived(sanitizeDOM(post.full || post.intro || ''))
</script>

<Stack gap="m">
  <PostByline author={post.author} {repostHref} repostedBy={post.repostedBy} />
  {#if post.title}
    <h1 class="post_title">
      {#if post.url}
        <a class="post_title-url" href={post.url} target="_blank">
          <FormattedText html={post.title} lang={post.lang} scroll={false} />
        </a>
      {:else}
        <FormattedText html={post.title} lang={post.lang} scroll={false} />
      {/if}
    </h1>
  {/if}

  {#if post.replied && !post.replied.missing}
    <PostQuote
      caption={$t.replyingTo}
      full
      linked
      quoted={post.replied}
      {userPostUrl}
    />
  {/if}
  <PostWarning lang={post.lang} warning={post.warning}>
    {#if post.full || post.intro}
      <FormattedText html={text} lang={post.lang} />
    {/if}
    {#if post.poll}
      <PostPoll lang={post.lang} poll={post.poll} {post} {userPostUrl} />
    {/if}

    <PostMedia
      media={getMediaOutsideText(
        addMediaSizes(post.media, post.mediaSizes),
        text,
        false
      )}
    />

    {#if post.quoted}
      <PostQuote full linked quoted={post.quoted} {userPostUrl} />
    {/if}
    {#if post.preview}
      <PostPreview preview={post.preview} />
    {/if}
  </PostWarning>

  {#if post.unsupported}
    <Note icon={mdiPuzzleOutline} variant="neutral">{$t.unsupported}</Note>
  {/if}
</Stack>

<style>
  :global {
    .post_title {
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
  }
</style>
