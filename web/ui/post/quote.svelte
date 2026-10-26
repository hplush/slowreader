<script lang="ts">
  import {
    addMediaSizes,
    canOpenPostUrl,
    getMediaOutsideText,
    getQuotedIntro,
    type QuotedPost,
    router,
    sanitizeDOM,
    postMessages as t,
    type UserPostUrl
  } from '@slowreader/core'

  import { getPopupHash } from '../../stores/url-router.ts'
  import FormattedText from '../formatted-text.svelte'
  import PostAuthorLine from './author.svelte'
  import PostMedia from './media.svelte'
  import PostPoll from './poll.svelte'
  import PostPreview from './preview.svelte'
  import PostWarning from './warning.svelte'

  let {
    caption,
    full,
    linked,
    quoted,
    userPostUrl
  }: {
    caption?: string
    full?: boolean
    linked?: boolean
    quoted: QuotedPost
    userPostUrl: UserPostUrl
  } = $props()

  let id = $props.id()

  let text = $derived(
    full ? sanitizeDOM(quoted.full ?? '') : getQuotedIntro(quoted)
  )

  let href = $derived(
    linked && !quoted.missing && quoted.url
      ? getPostHref(quoted.url)
      : undefined
  )

  function getPostHref(url: string): string | undefined {
    return canOpenPostUrl(url) ? getPopupHash($router, 'post', url) : undefined
  }
</script>

{#snippet nested(url: null | string | undefined, alone: boolean)}
  {@const popup = url ? getPostHref(url) : undefined}
  <a
    class="post-quote_nested"
    class:is-alone={alone}
    href={popup ?? url}
    target={popup ? undefined : '_blank'}
  >
    {$t.quoteOfQuote}
  </a>
{/snippet}

{#if quoted.missing}
  <div class="post-quote is-missing">{$t.quoteMissing}</div>
{:else if !quoted.full && !quoted.author && !quoted.media}
  {@render nested(quoted.url, true)}
{:else}
  <blockquote {id} class="post-quote" cite={quoted.url}>
    {#if href}
      <a class="post-quote_link" aria-labelledby={id} {href}></a>
    {/if}
    <div class="post-quote_content">
      {#if caption}
        <div class="post-quote_caption">{caption}</div>
      {/if}
      {#if quoted.author}
        <PostAuthorLine author={quoted.author} />
      {/if}
      <PostWarning lang={quoted.lang} warning={quoted.warning}>
        <FormattedText html={text} lang={quoted.lang} simple={!full} />
        {#if quoted.poll}
          <PostPoll
            lang={quoted.lang}
            poll={quoted.poll}
            post={quoted}
            {userPostUrl}
          />
        {/if}
        <PostMedia
          media={getMediaOutsideText(
            addMediaSizes(quoted.media, quoted.mediaSizes),
            text,
            !full
          )}
        />
        {#if quoted.preview}
          <PostPreview preview={quoted.preview} />
        {/if}
        {#if quoted.quotedUrl}
          {@render nested(quoted.quotedUrl, false)}
        {/if}
      </PostWarning>
    </div>
  </blockquote>
{/if}

<style lang="postcss">
  :global {
    .post-quote {
      --post-quote-background: var(--current-background);

      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.625rem;
      position: relative;
      margin-top: 0.625rem;
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);
      border-radius: calc(var(--base-radius) + 0.625rem);

      &:has(.post-quote_link:hover),
      &:has(.post-quote_link:focus-visible) {
        --post-quote-background: --tune-background(--flat-button-hover);

        background: var(--post-quote-background);
      }

      &:has(.post-quote_link:active) {
        --post-quote-background: --tune-background(--flat-button-hover);

        background: var(--post-quote-background);
        box-shadow: var(--pressed-shadow);
      }

      &.is-missing {
        font: var(--secondary-font);
        color: var(--secondary-text-color);
      }
    }

    .post-quote a:not(.post-quote_link) {
      position: relative;
      z-index: 2;
    }

    .post-quote_link {
      @mixin clickable;

      position: absolute;
      inset: 0;
      z-index: 1;
      border-radius: inherit;
    }

    .post-quote_nested {
      @mixin clickable;

      padding: 0.25rem 0.625rem;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
      text-decoration: none;
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);
      border-radius: var(--base-radius);

      &:hover,
      &:focus-visible {
        text-decoration: underline;
      }

      &.is-alone {
        margin-top: 0.625rem;
      }
    }

    .post-quote_content {
      --current-background: var(--post-quote-background);

      display: contents;
    }

    .post-quote_caption {
      font: var(--secondary-font);
      color: var(--secondary-text-color);
    }
  }
</style>
