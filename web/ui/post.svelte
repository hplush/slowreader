<script lang="ts">
  import { type OriginPost, parseMedia, type PostValue } from '@slowreader/core'

  import FormattedText from './formatted-text.svelte'

  let { post }: { post: OriginPost | PostValue } = $props()
</script>

{#if post.title}
  <h1 class="post_title">
    <FormattedText html={post.title} noscroll />
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

<style>
  :global {
    .post_title {
      font: var(--post-title-font);
    }

    .post_image {
      max-width: 100%;
      height: auto;
      padding-top: 0.625rem;
      margin: 0 auto;
    }
  }
</style>
