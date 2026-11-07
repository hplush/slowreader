<script lang="ts">
  import { type CardAuthor, router } from '@slowreader/core'

  import { waitImageDecoded } from '../../lib/image.ts'
  import { getPopupHash } from '../../stores/url-router.ts'
  import BrokenImage from '../broken-image.svelte'

  let { author }: { author: CardAuthor } = $props()

  let broken = $state<null | string>()
  let loaded = $state<null | string>()
</script>

<svelte:element
  this={author.url ? 'a' : 'span'}
  class="post-author"
  href={author.url && getPopupHash($router, 'feed', author.url)}
>
  {#if author.avatar && broken === author.avatar}
    <span class="post-author_avatar">
      <BrokenImage />
    </span>
  {:else if author.avatar}
    <img
      class="post-author_avatar"
      class:is-loading={loaded !== author.avatar}
      alt=""
      decoding="async"
      loading="lazy"
      onerror={() => {
        broken = author.avatar
      }}
      onload={async event => {
        let src = author.avatar
        await waitImageDecoded(event.currentTarget)
        loaded = src
      }}
      referrerpolicy="no-referrer"
      src={author.avatar}
    />
  {/if}
  {#if author.url}
    <span class="post-author_names">
      <span class="post-author_title">{author.title}</span>
      <span class="post-author_handle">{author.handle}</span>
    </span>
  {:else}
    <span class="post-author_title">{author.title}</span>
  {/if}
</svelte:element>

<style lang="postcss">
  :global {
    .post-author {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      max-width: 100%;
      font: var(--secondary-title-font);
      color: var(--text-color);
      text-decoration: none;

      &:is(a) {
        @mixin clickable;

        border-radius: var(--base-radius);

        &:hover,
        &:active,
        &:focus-visible {
          text-decoration: underline;
        }
      }
    }

    .post-author_avatar {
      flex-shrink: 0;
      width: 1.5rem;
      height: 1.5rem;
      overflow: hidden;
      border-radius: 50%;

      &.is-loading {
        background: --tune-background(--image-placeholder);
      }
    }

    .post-author_names {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .post-author_title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .post-author_handle {
      overflow: hidden;
      text-overflow: ellipsis;
      font: var(--tertiary-font);
      line-height: 1.4;
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
  }
</style>
