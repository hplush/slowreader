<script lang="ts">
  import { type OriginPost, parseMedia, type PostValue } from '@slowreader/core'

  import FormattedText from './formatted-text.svelte'

  let { post }: { post: OriginPost | PostValue } = $props()
</script>

<div class="post">
  {#if post.title}
    <h1 class="post_title">
      {#if post.url}
        <a class="post_title-url" href={post.url} target="_blank">
          <FormattedText html={post.title} scroll={false} />
        </a>
      {:else}
        <FormattedText html={post.title} scroll={false} />
      {/if}
    </h1>
  {/if}

  {#each parseMedia(post.media) as media, index (`${media.url}${index}`)}
    {#if !media.fromText && media.type.startsWith('image')}
      <img class="post_image" alt="" src={media.url} />
    {/if}
  {/each}

  {#if post.full}
    <FormattedText html={post.full} />
  {:else if post.intro}
    <FormattedText html={post.intro} />
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
