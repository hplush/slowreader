<script lang="ts">
  import { mdiRepeatVariant } from '@mdi/js'
  import { type PostAuthor, postMessages as t } from '@slowreader/core'

  import Icon from '../icon.svelte'
  import PostAuthorLine from './author.svelte'

  let {
    author,
    repostedBy,
    repostHref
  }: {
    author: null | PostAuthor | undefined
    repostedBy: null | PostAuthor | undefined
    repostHref?: string
  } = $props()

  let [before, after] = $derived($t.repostedBy({ name: '\0' }).split('\0'))
</script>

{#if repostedBy || author}
  <div class="post-byline">
    {#if repostedBy}
      <div class="post-byline_repost">
        <Icon path={mdiRepeatVariant} />
        {#if repostHref}
          <span>
            {before}<a class="post-byline_link" href={repostHref}
              >{repostedBy.title}</a
            >{after}
          </span>
        {:else}
          {$t.repostedBy({ name: repostedBy.title })}
        {/if}
      </div>
    {/if}
    {#if author}
      <PostAuthorLine {author} />
    {/if}
  </div>
{/if}

<style lang="postcss">
  :global {
    .post-byline {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      margin-bottom: 0.75rem;
    }

    .post-byline_link {
      color: inherit;
      text-decoration: none;

      &:hover,
      &:focus-visible {
        text-decoration: underline;
      }
    }

    .post-byline_repost {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
    }
  }
</style>
