<script lang="ts">
  import {
    type FeedValue,
    type OriginPost,
    parseMedia,
    type PostValue
  } from '@slowreader/core'

  import FormattedText from './formatted-text.svelte'

  let {
    feed,
    post
  }: { feed: FeedValue | undefined; post: OriginPost | PostValue } = $props()

  let url = $derived(post.url ?? feed?.url)
</script>

<div class="post">
  {#if post.title}
    <h1 class="post_title">
      {#if post.url}
        <a class="post_title-url" href={post.url} target="_blank">
          <FormattedText html={post.title} scroll={false} {url} />
        </a>
      {:else}
        <FormattedText html={post.title} scroll={false} {url} />
      {/if}
    </h1>
  {/if}

  {#each parseMedia(post.media) as media, index (`${media.url}${index}`)}
    {#if !media.fromText && media.type.startsWith('image')}
      <img class="post_image" alt="" src={media.url} />
    {/if}
  {/each}

  {#if post.full}
    <FormattedText html={post.full} {url} />
  {:else if post.intro}
    <FormattedText html={post.intro} {url} />
  {/if}
</div>

<style>
  :global {
    .post {
      display: flex;
      flex-shrink: 1;
      flex-direction: column;
      width: stretch;
    }

    .post_title {
      margin-bottom: 0.75rem;
      font: var(--post-title-font);
    }

    .post_title-url {
      color: currentcolor;
      text-decoration: none;

      &:hover,
      &:active,
      &:focus-visible {
        text-decoration: underline;
      }

      &:focus-visible {
        border-radius: var(--base-radius);
      }
    }

    .post_image {
      max-width: 100%;
      height: auto;
      padding-top: 0.625rem;
      margin: 0 auto;
    }
  }
</style>
