<script lang="ts">
  import {
    addMediaSizes,
    getQuotedIntro,
    type QuotedPost,
    postMessages as t
  } from '@slowreader/core'

  import FormattedText from '../formatted-text.svelte'
  import SmallLink from '../small-link.svelte'
  import PostAuthorLine from './author.svelte'
  import PostMedia from './media.svelte'
  import PostPreview from './preview.svelte'
  import PostWarning from './warning.svelte'

  let { full, quoted }: { full?: boolean; quoted: QuotedPost } = $props()
</script>

{#if quoted.missing}
  <div class="post-quote is-missing">{$t.quoteMissing}</div>
{:else}
  <blockquote class="post-quote" cite={quoted.url}>
    {#if quoted.author || quoted.url}
      <div class="post-quote_header">
        {#if quoted.author}
          <PostAuthorLine author={quoted.author} />
        {/if}
        {#if quoted.url}
          <SmallLink href={quoted.url} target="_blank">{$t.url}</SmallLink>
        {/if}
      </div>
    {/if}
    <PostWarning warning={quoted.warning}>
      <FormattedText
        html={full ? (quoted.full ?? undefined) : getQuotedIntro(quoted)}
        simple={!full}
      />
      <PostMedia media={addMediaSizes(quoted.media, quoted.mediaSizes)} />
      {#if quoted.preview}
        <PostPreview preview={quoted.preview} />
      {/if}
      {#if quoted.quotedUrl}
        <a class="post-quote_nested" href={quoted.quotedUrl} target="_blank">
          {$t.quoteOfQuote}
        </a>
      {/if}
    </PostWarning>
  </blockquote>
{/if}

<style lang="postcss">
  :global {
    .post-quote {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.625rem;
      margin-top: 0.625rem;
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);
      border-radius: var(--base-radius);

      &.is-missing {
        font: var(--secondary-font);
        color: var(--secondary-text-color);
      }
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
    }

    .post-quote_header {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      justify-content: space-between;
    }
  }
</style>
