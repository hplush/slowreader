<script lang="ts">
  import type { LoadedSyncMap, SyncMapStore } from '@logux/client'
  import { mdiChevronRight } from '@mdi/js'
  import {
    type FeedValue,
    getPopupId,
    getPostIntro,
    getPostPopupParam,
    openedPost,
    type PostValue,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../../stores/url-router.ts'
  import FormattedText from '../formatted-text.svelte'
  import Icon from '../icon.svelte'
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
  <div id={`feed-content-${$post.id}`} class="feed-post_content">
    {#if author}
      <FeedAuthor {author} />
    {/if}
    {#if more}
      <div class="feed-post_more">
        <Icon path={mdiChevronRight} />
      </div>
    {/if}
    {#if $post.title}
      <h2 class="feed-post_title">
        <FormattedText html={$post.title} />
      </h2>
    {/if}
    <FormattedText html={intro} />
  </div>
</li>

<style lang="postcss">
  :global {
    .feed-post {
      position: relative;
      padding: 0.875rem var(--control-padding);
      overflow-wrap: anywhere;
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);

      &:not(.is-read) {
        background: --tune-background(--field);
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
        box-shadow: var(--flat-control-shadow);

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
        background: --tune-background(--field --flat-button-hover);
      }

      &:has(.feed-post_link:active) {
        z-index: 1;
        box-shadow: var(--pressed-shadow);
      }

      &.is-current {
        z-index: 1;
        cursor: default;
        background: --tune-background(--opened-feed);
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

    .feed-post_more {
      float: inline-end;
      margin-inline-end: -0.5rem;
      margin-top: 0.5rem;
    }

    .feed-post_title {
      margin-top: -0.325rem;
      margin-bottom: 0.5rem;
      font: var(--subtitle-font);
    }
  }
</style>
