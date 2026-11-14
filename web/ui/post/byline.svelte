<script lang="ts">
  import { mdiRepeatVariant } from '@mdi/js'
  import {
    type CardAuthor,
    type PostAuthor,
    router,
    postMessages as t
  } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  import { getPopupHash } from '../../stores/url-router.ts'
  import Icon from '../icon.svelte'
  import PostAuthorLine from './author.svelte'

  let {
    aside,
    author,
    repostedBy,
    repostHref
  }: {
    aside?: Snippet
    author: CardAuthor | null | undefined
    repostedBy: null | PostAuthor | undefined
    repostHref?: string
  } = $props()

  let [before, after] = $derived($t.repostedBy({ name: '\0' }).split('\0'))

  // Account’s posts have no feed to link, but reposter has own profile
  let reposterHref = $derived(
    repostHref ??
      (repostedBy?.url && getPopupHash($router, 'feed', repostedBy.url))
  )
</script>

{#if repostedBy || author}
  <div class="post-byline">
    {#if repostedBy}
      <div class="post-byline_line">
        <div class="post-byline_repost">
          <Icon path={mdiRepeatVariant} />
          {#if reposterHref}
            <span class="post-byline_text">
              {before}<a class="post-byline_link" href={reposterHref}
                >{repostedBy.title}</a
              >{after}
            </span>
          {:else}
            {$t.repostedBy({ name: repostedBy.title })}
          {/if}
        </div>
        {@render aside?.()}
      </div>
    {/if}
    {#if author}
      <div class="post-byline_line">
        <PostAuthorLine {author} />
        {#if !repostedBy}
          {@render aside?.()}
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style lang="postcss">
  :global {
    .post-byline {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      max-width: 100%;
    }

    .post-byline_link {
      color: inherit;
      text-decoration: none;

      &:hover,
      &:focus-visible {
        text-decoration: underline;
      }
    }

    .post-byline_text {
      flex-shrink: 1;
      min-width: 0;
    }

    .post-byline_line {
      display: flex;
      gap: 0.5rem;
      align-items: flex-start;
    }

    .post-byline_repost {
      display: flex;
      flex-shrink: 1;
      min-width: 0;
      gap: 0.25rem;
      align-items: center;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
    }
  }
</style>
