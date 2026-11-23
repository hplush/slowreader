<script lang="ts">
  import {
    getLinkPopup,
    type LoaderName,
    openPopup,
    type PostPreview,
    router,
    saveData
  } from '@slowreader/core'

  import { waitImageDecoded } from '../../lib/image.ts'
  import { mediaSrc } from '../../lib/media.ts'
  import { getPopupHash } from '../../stores/url-router.ts'
  import BrokenImage from '../broken-image.svelte'

  let {
    loader,
    preview,
    protect = false
  }: {
    loader: LoaderName | null | undefined
    preview: PostPreview
    protect?: boolean | null
  } = $props()

  let broken = $state<null | string>()
  let loaded = $state<null | string>()
  let image = $derived($saveData ? undefined : preview.image)
  let popup = $derived(getLinkPopup('', preview.url, loader))
</script>

<a
  class="post-preview"
  class:is-protected={protect}
  href={popup ? getPopupHash($router, popup, preview.url) : preview.url}
  onclick={event => {
    if (!popup || event.ctrlKey || event.metaKey || event.shiftKey) return
    event.preventDefault()
    openPopup(popup, preview.url)
  }}
  rel={popup ? undefined : 'noopener'}
  target={popup ? undefined : '_blank'}
>
  {#if image && broken === image}
    <span class="post-preview_image is-broken">
      <BrokenImage />
    </span>
  {:else if image}
    <img
      class="post-preview_image"
      class:is-loading={loaded !== image}
      {@attach mediaSrc(image, { once: !!protect })}
      alt=""
      decoding="async"
      draggable={protect ? 'false' : undefined}
      loading="lazy"
      oncontextmenu={event => {
        if (protect) event.preventDefault()
      }}
      onerror={() => {
        broken = image
      }}
      onload={async event => {
        let src = image
        await waitImageDecoded(event.currentTarget)
        loaded = src
      }}
      referrerpolicy="no-referrer"
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
      overflow: hidden;
      color: var(--text-color);
      text-decoration: none;
      border-radius: var(--base-radius);
      position: relative;

      &:hover .post-preview_title,
      &:focus-visible .post-preview_title {
        text-decoration: underline;
      }

      /* Image covers inset shadow of the link itself */
      &::after {
        position: absolute;
        inset: 0;
        pointer-events: none;
        content: '';
        border-radius: inherit;
        box-shadow: var(--flat-control-shadow);
      }

      &:active::after {
        box-shadow: var(--pressed-shadow);
      }
    }

    .post-preview_image {
      width: 100%;
      max-height: 15rem;
      object-fit: cover;

      .post-preview.is-protected & {
        pointer-events: none;
      }

      .post-preview:active & {
        translate: 0 var(--min-size);
      }

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

      .post-preview:active & {
        translate: 0 var(--min-size);
      }
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
