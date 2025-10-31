<script lang="ts">
  import {
    getPostIntro,
    type OriginPost,
    type PostValue,
    router
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import FormattedText from './formatted-text.svelte'

  let { posts }: { posts: (OriginPost | PostValue)[] } = $props()
</script>

<ul class="posts">
  {#each posts as post (post.originId)}
    <li>
      <a class="posts_item" href={getPopupHash($router, 'post', post.originId)}>
        {#if post.title}
          {post.title}
        {/if}
        <FormattedText fakelinks html={getPostIntro(post)} />
      </a>
    </li>
  {/each}
</ul>

<style>
  :global {
    .posts {
      width: stretch;
      margin: 0 -1rem;
      list-style: none;
    }

    .posts_item {
      @mixin clickable;

      display: block;
      padding: 0.75rem 1rem;
      margin-top: calc(-1 * var(--min-size));
      font: var(--control-font);
      background: --tune-background(--flat-button);
      box-shadow: var(--flat-control-shadow);
      corner-shape: squircle;

      li:first-child & {
        margin-top: 0;
        border-radius: var(--base-radius) var(--base-radius) 0 0;
      }

      li:last-child & {
        border-radius: 0 0 var(--base-radius) var(--base-radius);
      }

      li:last-child:first-child & {
        border-radius: var(--base-radius);
      }

      &:hover,
      &:active,
      &:focus-visible {
        background: --tune-background(--flat-button --flat-button-hover);
      }

      &[aria-current='page'] {
        z-index: 1;
        cursor: default;
        background: --tune-background(--current);
        box-shadow: var(--current-shadow);
      }
    }
  }
</style>
