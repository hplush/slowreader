<script lang="ts">
  import type { PostPreview } from '@slowreader/core'

  import { waitImageDecoded } from '../../lib/image.ts'
  import BrokenImage from '../broken-image.svelte'

  let { preview }: { preview: PostPreview } = $props()

  let broken = $state<null | string>()
  let loaded = $state<null | string>()
</script>

<a class="post-preview" href={preview.url} rel="noopener" target="_blank">
  {#if preview.image && broken === preview.image}
    <span class="post-preview_image is-broken">
      <BrokenImage />
    </span>
  {:else if preview.image}
    <img
      class="post-preview_image"
      class:is-loading={loaded !== preview.image}
      alt=""
      decoding="async"
      loading="lazy"
      onerror={() => {
        broken = preview.image
      }}
      onload={async event => {
        let src = preview.image
        await waitImageDecoded(event.currentTarget)
        loaded = src
      }}
      referrerpolicy="no-referrer"
      src={preview.image}
    />
  {/if}
  <span class="post-preview_text">
    <span class="post-preview_host">{URL.parse(preview.url)?.hostname}</span>
    {#if preview.title}
      <span class="post-preview_title">{preview.title}</span>
    {/if}
    {#if preview.description}
      <span class="post-preview_description">{preview.description}</span>
    {/if}
  </span>
</a>

<style lang="postcss">
  :global {
    .post-preview {
      @mixin clickable;

      display: flex;
      flex-direction: column;
      margin-top: 0.625rem;
      overflow: hidden;
      color: var(--text-color);
      text-decoration: none;
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);
      border-radius: var(--base-radius);

      &:hover .post-preview_title,
      &:focus-visible .post-preview_title {
        text-decoration: underline;
      }
    }

    .post-preview_image {
      width: 100%;
      max-height: 15rem;
      object-fit: cover;

      &.is-loading,
      &.is-broken {
        aspect-ratio: 1.91;
      }

      &.is-loading {
        background: --tune-background(--image-placeholder);
      }
    }

    .post-preview_text {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.5rem 0.625rem;
    }

    .post-preview_host {
      font: var(--secondary-font);
      color: var(--secondary-text-color);
    }

    .post-preview_title {
      font: var(--secondary-title-font);
    }

    .post-preview_description {
      display: -webkit-box;
      overflow: hidden;
      font: var(--secondary-font);
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
  }
</style>
