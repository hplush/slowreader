<script lang="ts">
  import {
    getPopupId,
    getPostIntro,
    openedPost,
    type PostValue,
    router
  } from '@slowreader/core'

  import { getPostPopupParam } from '../../core/popups/post.ts'
  import { getPopupHash } from '../stores/url-router.ts'
  import FormattedText from './formatted-text.svelte'

  let { list }: { list: readonly PostValue[] } = $props()
</script>

<ul class="feed">
  {#each list as post (post.id)}
    <li class="feed_item" class:is-read={post.read}>
      <a
        class="feed_link"
        aria-controls={getPopupId('post', getPostPopupParam(post))}
        aria-current={$openedPost === post.id ? 'page' : null}
        aria-labelledby={`feed-content-${post.id}`}
        href={getPopupHash($router, 'post', getPostPopupParam(post))}
      ></a>
      <div id={`feed-content-${post.id}`}>
        <FormattedText html={getPostIntro(post)} />
      </div>
    </li>
  {/each}
</ul>

<style lang="postcss">
  :global {
    .feed {
      width: stretch;
      list-style: none;
    }

    .feed_item {
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

      &:has(.feed_link:hover),
      &:has(.feed_link:active),
      &:has(.feed_link:focus-visible) {
        background: --tune-background(--field --flat-button-hover);
      }

      &:has(.feed_link:not([aria-current='page']):active) {
        z-index: 1;
        padding-block: calc(0.875rem + var(--min-size))
          calc(0.875rem - var(--min-size));
        box-shadow: var(--pressed-shadow);
      }

      &:has(.feed_link[aria-current='page']) {
        z-index: 1;
        cursor: default;
        background: --tune-background(--current);
        box-shadow: var(--current-shadow);
      }
    }

    .feed_item a:not(.feed_link) {
      position: relative;
      z-index: 2;
    }

    .feed_link {
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
  }
</style>
