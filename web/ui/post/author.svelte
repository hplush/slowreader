<script lang="ts">
  import { type PostAuthor, router } from '@slowreader/core'

  import { waitImageDecoded } from '../../lib/image.ts'
  import { getPopupHash } from '../../stores/url-router.ts'
  import BrokenImage from '../broken-image.svelte'

  let { author }: { author: PostAuthor } = $props()

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
  <span class="post-author_title">{author.title}</span>
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

    .post-author_title {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
