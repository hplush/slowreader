<script lang="ts">
  import type { LoadedSyncMap, SyncMapStore } from '@logux/client'
  import { mdiChevronRight, mdiOpenInNew } from '@mdi/js'
  import {
    type FeedValue,
    getPopupId,
    getPostIntro,
    getPostPopupParam,
    openedPost,
    parseMedia,
    type PostValue,
    router,
    feedsMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../../stores/url-router.ts'
  import Button from '../button.svelte'
  import FormattedText from '../formatted-text.svelte'
  import FeedAuthor from './author.svelte'

  let {
    author,
    post
  }: {
    author: LoadedSyncMap<SyncMapStore<FeedValue>> | undefined
    post: LoadedSyncMap<SyncMapStore<PostValue>>
  } = $props()

  let [intro, more] = $derived(getPostIntro($post))
</script>

<li
  class="feed-post"
  class:is-current={$openedPost === $post.id}
  class:is-read={$post.read}
>
  <a
    class="feed-post_link"
    aria-controls={getPopupId('post', getPostPopupParam($post))}
    aria-current={$openedPost === $post.id ? 'page' : null}
    aria-labelledby={`feed-content-${$post.id}`}
    href={getPopupHash($router, 'post', getPostPopupParam($post))}
  ></a>
  <article id={`feed-content-${$post.id}`} class="feed-post_content">
    {#if author}
      <FeedAuthor {author} />
    {/if}
    {#if $post.title}
      <h2 class="feed-post_title">
        <FormattedText html={$post.title} />
      </h2>
    {/if}
    <FormattedText html={intro} />
    {#each parseMedia($post.media) as media, index (`${media.url}${index}`)}
      {#if !media.fromText && media.type.startsWith('image')}
        <img class="feed-post_image" alt="" src={media.url} />
      {/if}
    {/each}
    <footer class="feed-post_actions">
      <div class="feed-post_fill"></div>
      {#if $post.url}
        <Button
          href={$post.url}
          icon={mdiOpenInNew}
          size="icon"
          target="_blank"
          variant="plain"
        >
          {$t.openPostLink}
        </Button>
      {/if}
      {#if more}
        <Button
          href={getPopupHash($router, 'post', getPostPopupParam($post))}
          icon={mdiChevronRight}
          size="icon"
          variant="plain"
        >
          {$t.more}
        </Button>
      {/if}
    </footer>
  </article>
</li>

<style lang="postcss">
  :global {
    .feed-post {
      --feed-post-background: var(--current-background);

      position: relative;
      padding: 0.875rem var(--control-padding) 0 var(--control-padding);
      overflow-wrap: anywhere;
      background: var(--feed-post-background);
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);

      &:not(.is-read) {
        --feed-post-background: --tune-background(--field);
      }

      &.is-read {
        color: var(--secondary-text-color);
      }

      &:not(:last-child) {
        border-bottom: none;
      }

      @media (--mobile) {
        margin-inline: calc(-1 * var(--page-padding) - var(--min-size));
        border-inline: none;
      }

      @media (--no-mobile) {
        margin-top: calc(-1 * var(--min-size));

        &:first-child {
          margin-top: 0;
          border-radius: var(--base-radius) var(--base-radius) 0 0;
        }

        &:last-child {
          border-radius: 0 0 var(--base-radius) var(--base-radius);
        }

        &:last-child:first-child {
          border-radius: var(--base-radius);
        }
      }

      &:not(.is-current):has(.feed-post_link:hover),
      &:has(.feed-post_link:active),
      &:has(.feed-post_link:focus-visible) {
        --feed-post-background: --tune-background(--field --flat-button-hover);
      }

      &:has(.feed-post_link:active) {
        z-index: 1;
        box-shadow: var(--pressed-shadow);
      }

      &.is-current {
        z-index: 1;
        cursor: default;

        --feed-post-background: --tune-background(--opened-feed);

        box-shadow: var(--current-shadow);
      }
    }

    .feed-post a:not(.feed-post_link) {
      position: relative;
      z-index: 2;
    }

    .feed-post_link {
      @mixin clickable;

      position: absolute;
      inset: 0;
      z-index: 1;
      display: block;
      width: 100%;
      height: 100%;

      li:first-child & {
        border-radius: var(--base-radius) var(--base-radius) 0 0;
      }

      li:last-child & {
        border-radius: 0 0 var(--base-radius) var(--base-radius);
      }

      li:last-child:first-child & {
        border-radius: var(--base-radius);
      }
    }

    .feed-post_content {
      .feed-post_link:active + & {
        translate: 0 var(--min-size);
      }
    }

    .feed-post_title {
      margin-top: -0.325rem;
      margin-bottom: 0.5rem;
      font: var(--subtitle-font);
    }

    .feed-post_image {
      max-width: 100%;
      height: auto;
      padding-top: 0.625rem;
      margin: 0 auto;
    }

    .feed-post_actions {
      --current-background: var(--feed-post-background);

      display: flex;
      padding: 0.25rem;
      margin-inline: calc(-1 * var(--control-padding));
    }

    .feed-post_fill {
      flex-grow: 1;
    }

    .feed-post_more {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: var(--control-height);
      padding-inline-end: 0.5rem;
    }
  }
</style>
