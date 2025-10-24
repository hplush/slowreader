<script lang="ts">
  import { mdiChevronRight, mdiCircleSmall } from '@mdi/js'
  import type { FeedLoader, FeedValue } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'

  let {
    current,
    id,
    list
  }: {
    current: string | undefined
    id?: string
    list: readonly (FeedLoader | FeedValue)[]
  } = $props()

  function getId(feed: FeedLoader | FeedValue): string {
    return 'id' in feed ? feed.id : feed.url
  }
</script>

<ol {id} class="feeds" role="menu">
  {#each list as feed (feed.url)}
    <li>
      <Clickable
        class="feeds_item"
        aria-current={current === getId(feed) ? 'page' : null}
        href={'id' in feed
          ? getPopupHash(undefined, 'feed', feed.id)
          : getPopupHash(undefined, 'feedUrl', feed.url)}
        role="menuitem"
      >
        <div class="feeds_cap">
          {feed.title}
          <div class="feeds_dot">
            <Icon path={mdiCircleSmall} />
          </div>
          <div class="feeds_arrow">
            <Icon path={mdiChevronRight} />
          </div>
        </div>
      </Clickable>
    </li>
  {/each}
</ol>

<style>
  :global {
    .feeds {
      width: stretch;
      list-style: none;
    }

    .feeds_item {
      @mixin clickable;

      position: relative;
      display: block;
      margin-top: calc(-1 * var(--min-size));
      font: var(--control-font);
      background: --tune-background(--flat-button);
      box-shadow: var(--flat-control-shadow);

      li:first-child & {
        margin-top: 0;
        border-radius: var(--base-radius) var(--base-radius) 0 0;
        corner-shape: squircle;
      }

      li:last-child & {
        border-radius: 0 0 var(--base-radius) var(--base-radius);
        corner-shape: squircle;
      }

      li:last-child:first-child & {
        border-radius: var(--base-radius);
        corner-shape: squircle;
      }

      &:active {
        z-index: 1;
        box-shadow: var(--pressed-shadow);
      }

      &[aria-current='page'] {
        z-index: 1;
        cursor: default;
        background: --tune-background(--current);
        box-shadow: var(--current-shadow);
      }
    }

    .feeds_cap {
      padding: 0.8rem var(--control-padding);
      overflow-wrap: anywhere;

      @media (--no-mobile) {
        padding-inline-end: calc(1.2rem + 2 * 0.125rem);
      }

      .feeds_item:not([aria-current='page']):active & {
        translate: 0 1px;
      }
    }

    .feeds_arrow,
    .feeds_dot {
      --icon-size: 1.2rem;

      position: absolute;
      inset-block: 0;
      inset-inline-end: 0.125rem;
      display: flex;
      align-items: center;

      .feeds_item:not([aria-current='page']) & {
        opacity: 20%;
      }
    }

    .feeds_arrow {
      @media (--no-mobile) {
        .feeds_item:not([aria-current='page']) & {
          display: none;
        }
      }
    }

    .feeds_dot {
      @media (--mobile) {
        display: none;
      }

      @media (--no-mobile) {
        .feeds_item[aria-current='page'] & {
          display: none;
        }
      }
    }
  }
</style>
