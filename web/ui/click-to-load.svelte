<script lang="ts">
  import { mdiArrowDown, mdiEyeOffOutline, mdiPlay } from '@mdi/js'
  import {
    cacheMediaOnRequest,
    formatSize,
    i18nFormat,
    postMessages as t
  } from '@slowreader/core'

  import Clickable from './clickable.svelte'
  import Icon from './icon.svelte'
  import Loader from './loader.svelte'

  let {
    alt,
    bytes,
    height,
    onload,
    placeholder,
    play = false,
    sensitive = false,
    url,
    video = false,
    width
  }: {
    alt?: null | string
    bytes?: null | number
    height?: null | number
    onload: () => void
    placeholder?: null | string
    play?: boolean
    sensitive?: boolean
    url: string
    video?: boolean
    width?: null | number
  } = $props()

  let id = $props.id()
  let label = $derived.by(() => {
    if (play) return $t.playVideo
    return sensitive ? $t.downloadSensitive : $t.downloadImage
  })
  let ratio = $derived(width && height ? [width, height] : [1600, 900])
  let loading = $state(false)

  async function download(): Promise<void> {
    if (play) {
      onload()
      return
    }
    loading = true
    try {
      await cacheMediaOnRequest(url, video)
    } catch {
      // Browser will try to load it directly and show the broken image
    }
    onload()
  }
</script>

<span class="click-to-load" class:is-blurred={placeholder}>
  <svg
    class="click-to-load_ratio"
    aria-hidden="true"
    height={ratio[1]}
    viewBox={`0 0 ${ratio[0]} ${ratio[1]}`}
    width={ratio[0]}
  ></svg>
  {#if placeholder}
    <img class="click-to-load_blur" alt="" src={placeholder} />
  {/if}
  <span class="click-to-load_content">
    <Clickable
      class="click-to-load_download"
      aria-describedby={alt ? id : undefined}
      aria-label={[
        label,
        sensitive && $t.sensitiveMedia,
        bytes && formatSize($i18nFormat, bytes)
      ]
        .filter(Boolean)
        .join(', ')}
      disabled={loading}
      onclick={download}
      title={label}
    >
      <span class="click-to-load_circle">
        {#if loading}
          <Loader />
        {:else}
          <Icon path={play ? mdiPlay : mdiArrowDown} />
        {/if}
      </span>
      {#if bytes}
        <span class="click-to-load_size">
          {formatSize($i18nFormat, bytes)}
        </span>
      {/if}
    </Clickable>
    {#if sensitive}
      <span class="click-to-load_sensitive" aria-hidden="true">
        <Icon path={mdiEyeOffOutline} />
        {$t.sensitiveMedia}
      </span>
    {/if}
    {#if alt}
      <span {id} class="click-to-load_alt">{alt}</span>
    {/if}
  </span>
</span>

<style lang="postcss">
  :global {
    .click-to-load {
      display: grid;
      max-width: 100%;
      color: var(--secondary-text-color);
      text-align: center;
      background: --tune-background(--image-placeholder);
      border-radius: var(--base-radius);

      &.is-blurred {
        position: relative;
        overflow: hidden;
      }
    }

    .click-to-load_blur {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: blur(1rem);

      /* Blur makes the edges of the image transparent */
      scale: 1.2;
    }

    .click-to-load_ratio {
      display: block;
      grid-area: 1 / 1;
      max-width: 100%;
      height: auto;
    }

    .click-to-load_content {
      display: flex;
      flex-direction: column;
      grid-area: 1 / 1;
      gap: 0.5rem;
      align-items: center;
      justify-content: center;
      min-width: 0;
      padding: 1rem;

      .click-to-load.is-blurred & {
        position: relative;
      }
    }

    .click-to-load_download {
      @mixin clickable;

      position: relative;
      z-index: 2;
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      gap: 0.25rem;
      align-items: center;
      padding: 0.25rem;
      color: var(--secondary-text-color);
      border-radius: var(--base-radius);

      &:hover:not([aria-disabled='true']),
      &:active:not([aria-disabled='true']),
      &:focus-visible {
        color: var(--text-color);
      }
    }

    .click-to-load_circle {
      --icon-size: 1.75rem;

      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      color: var(--text-color);
      background: --tune-background(--flat-button);
      border-radius: 50%;
      box-shadow: var(--flat-control-shadow);

      .click-to-load_download:hover:not([aria-disabled='true']) &,
      .click-to-load_download:focus-visible & {
        background: --tune-background(--flat-button --flat-button-hover);
      }

      .click-to-load_download:active:not([aria-disabled='true']) & {
        box-shadow: var(--pressed-shadow);
      }
    }

    .click-to-load_size {
      font: var(--control-secondary-font);
    }

    .click-to-load.is-blurred .click-to-load_size,
    .click-to-load.is-blurred .click-to-load_alt {
      padding: 0.125rem 0.375rem;
      color: var(--text-color);
      background: var(--current-background);
      border-radius: var(--base-radius);
    }

    .click-to-load_sensitive {
      display: flex;
      gap: 0.25rem;
      align-items: center;
      font-weight: var(--semibold-weight);
      color: var(--text-color);
    }

    .click-to-load_alt {
      display: -webkit-box;
      max-width: 100%;
      overflow: hidden;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
  }
</style>
