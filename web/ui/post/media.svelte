<script lang="ts">
  import { mdiEyeOutline } from '@mdi/js'
  import {
    commonMessages,
    isLoaderMedia,
    isMediaCached,
    type ReaderMedia,
    reportLoader,
    saveData,
    showSensitiveMedia,
    postMessages as t,
    waitsClick
  } from '@slowreader/core'
  import type { Attachment } from 'svelte/attachments'
  import { SvelteSet } from 'svelte/reactivity'

  import { blurredBackground, waitImageDecoded } from '../../lib/image.ts'
  import { mediaSrc } from '../../lib/media.ts'
  import BrokenImage from '../broken-image.svelte'
  import Button from '../button.svelte'
  import ClickToLoad from '../click-to-load.svelte'

  let {
    media,
    protect = false,
    warningClicked = false
  }: {
    media: ReaderMedia[]
    protect?: boolean | null
    warningClicked?: boolean
  } = $props()

  function blockSaving(event: Event): void {
    if (protect) event.preventDefault()
  }

  function playAfterClick(url: string, video: HTMLVideoElement): void {
    if (clicked === url && video.paused) video.play().catch(() => {})
  }

  let broken = new SvelteSet<string>()
  let loaded = new SvelteSet<string>()
  let downloaded = new SvelteSet<string>()
  let revealed = $state(false)
  let clicked = $state<string>()

  function focusClicked(url: string): Attachment<HTMLElement> {
    return element => {
      if (clicked !== url) return
      element.tabIndex = -1
      element.focus({ preventScroll: true })
    }
  }

  /**
   * Browser shows broken video icon in controls until video gets the file,
   * and loader’s file is ready only seconds after the click.
   */
  function waitsFile(item: ReaderMedia): boolean {
    return (
      isLoaderMedia(item.url) && !loaded.has(item.url) && !broken.has(item.url)
    )
  }

  let sensitiveShown = $derived(
    revealed || warningClicked || $showSensitiveMedia
  )

  let hidden = $derived(
    !sensitiveShown &&
      media.some(
        item => item.sensitive && !waitsClick(item, $saveData, downloaded)
      )
  )

  $effect(() => {
    if (!$saveData) return
    for (let item of media) {
      void isMediaCached(item.url).then(cached => {
        if (cached) downloaded.add(item.url)
      })
    }
  })
</script>

{#snippet sources(item: ReaderMedia)}
  {#each item.sources ?? [] as source, index (`${source.url}${index}`)}
    <source src={source.url} type={source.type} />
  {/each}
  {#if !isLoaderMedia(item.url)}
    <source src={item.url} />
  {/if}
{/snippet}

{#snippet image(item: ReaderMedia)}
  <!-- Firefox makes loader’s image square until it gets src -->
  <img
    style:aspect-ratio={!loaded.has(item.url) &&
    item.size?.width &&
    item.size.height
      ? `${item.size.width} / ${item.size.height}`
      : undefined}
    style:background-image={item.placeholder && !loaded.has(item.url)
      ? blurredBackground(item.placeholder, item.size?.width, item.size?.height)
      : undefined}
    class="post-media_item"
    class:is-loading={!loaded.has(item.url)}
    {@attach focusClicked(item.url)}
    {@attach mediaSrc(item.url, { once: !!protect })}
    alt={item.alt ?? ''}
    decoding="async"
    height={item.size?.height}
    loading="lazy"
    onerror={() => {
      broken.add(item.url)
    }}
    onload={async event => {
      await waitImageDecoded(event.currentTarget)
      loaded.add(item.url)
    }}
    title={item.alt}
    width={item.size?.width}
  />
{/snippet}

{#snippet loader()}
  <svg
    class="post-media_loader"
    {@attach () => reportLoader('media')}
    aria-label={$commonMessages.loading}
    role="progressbar"
    viewBox="0 0 12 12"
  >
    <circle
      class="post-media_track"
      cx="6"
      cy="6"
      fill="none"
      r="3"
      stroke-width="1"
    />
    <circle
      class="post-media_spinner"
      cx="6"
      cy="6"
      fill="none"
      r="3"
      stroke-dasharray="4.7 100"
      stroke-width="1"
    />
  </svg>
{/snippet}

{#snippet video(item: ReaderMedia)}
  <!-- svelte-ignore a11y_media_has_caption: feeds have no captions -->
  <video
    class="post-media_item"
    {@attach focusClicked(item.url)}
    {@attach mediaSrc(item.url, { web: false })}
    {@attach mediaSrc($saveData ? undefined : item.poster, {
      attribute: 'poster'
    })}
    aria-busy={waitsFile(item)}
    aria-label={item.alt}
    autoplay={clicked === item.url}
    controls={!waitsFile(item)}
    controlslist={protect ? 'nodownload noremoteplayback' : undefined}
    disablepictureinpicture={!!protect}
    height={item.size?.height}
    onerror={() => {
      broken.add(item.url)
    }}
    onloadeddata={event => {
      playAfterClick(item.url, event.currentTarget)
    }}
    onloadstart={() => {
      loaded.add(item.url)
    }}
    playsinline
    preload="none"
    title={item.alt}
    width={item.size?.width}
  >
    {@render sources(item)}
  </video>
{/snippet}

{#if media.length > 0}
  <div
    class="post-media"
    class:is-hidden={hidden}
    class:is-protected={protect}
    oncontextmenu={blockSaving}
    ondragstart={blockSaving}
    role="presentation"
  >
    <div class="post-media_list" inert={hidden}>
      {#each media as item, index (`${item.url}${index}`)}
        {#if waitsClick(item, $saveData, downloaded)}
          <ClickToLoad
            alt={item.alt}
            bytes={item.size?.approximate ? undefined : item.size?.bytes}
            height={item.size?.height}
            onload={() => {
              if (item.sensitive) revealed = true
              clicked = item.url
              downloaded.add(item.url)
            }}
            placeholder={item.sensitive && !sensitiveShown
              ? undefined
              : item.placeholder}
            play={item.type.startsWith('video') &&
              !item.type.endsWith(';mode=gif')}
            sensitive={!!item.sensitive && !sensitiveShown}
            url={item.url}
            video={!item.type.startsWith('image')}
            width={item.size?.width}
          />
        {:else if item.type.startsWith('image') && broken.has(item.url)}
          <span
            style:width={item.size?.width && `${item.size.width}px`}
            style:aspect-ratio={item.size?.width &&
              item.size.height &&
              `${item.size.width} / ${item.size.height}`}
            class="post-media_item is-broken"
          >
            <BrokenImage alt={item.alt} />
          </span>
        {:else if item.type.startsWith('image') && isLoaderMedia(item.url)}
          <span class="post-media_frame">
            {@render image(item)}
            {#if !loaded.has(item.url)}
              {@render loader()}
            {/if}
          </span>
        {:else if item.type.startsWith('image')}
          {@render image(item)}
        {:else if item.type.endsWith(';mode=gif')}
          <video
            class="post-media_item"
            {@attach focusClicked(item.url)}
            {@attach mediaSrc(item.url, { web: false })}
            {@attach mediaSrc(item.poster, { attribute: 'poster' })}
            aria-label={item.alt}
            autoplay
            disablepictureinpicture
            height={item.size?.height}
            loop
            muted
            playsinline
            title={item.alt}
            width={item.size?.width}
          >
            {@render sources(item)}
          </video>
        {:else if item.type.startsWith('video') && isLoaderMedia(item.url)}
          <span class="post-media_frame">
            {@render video(item)}
            {#if waitsFile(item)}
              {@render loader()}
            {/if}
          </span>
        {:else if item.type.startsWith('video')}
          {@render video(item)}
        {:else if item.type.startsWith('audio')}
          <audio
            class="post-media_audio"
            {@attach mediaSrc(item.url)}
            aria-label={item.alt}
            controls
            preload="none"
            title={item.alt}
          ></audio>
        {/if}
      {/each}
    </div>
    {#if hidden}
      <div class="post-media_cover">
        <Button
          icon={mdiEyeOutline}
          onclick={() => {
            revealed = true
          }}
        >
          {$t.showSensitive}
        </Button>
      </div>
    {/if}
  </div>
{/if}

<style lang="postcss">
  :global {
    .post-media {
      position: relative;
      max-width: 100%;
      overflow: hidden;
      border-radius: var(--base-radius);
    }

    .post-media_list {
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
      align-items: center;

      .post-media.is-hidden & {
        filter: blur(2rem);
      }
    }

    .post-media_item {
      max-width: 100%;
      height: auto;
      overflow: hidden;
      border-radius: var(--base-radius);

      .post-media.is-protected & {
        -webkit-touch-callout: none;
      }

      .post-media.is-protected &:is(img) {
        pointer-events: none;
      }

      &.is-loading {
        background: --tune-background(--image-placeholder);
        background-position: center;
        background-size: cover;

        &:not([width][height]) {
          width: 100%;
          aspect-ratio: auto 16 / 9;
        }
      }

      &.is-broken {
        display: block;
        width: 100%;
        aspect-ratio: 16 / 9;
      }
    }

    .post-media_frame {
      display: grid;
      max-width: 100%;

      &:has(.post-media_item.is-loading:not([width][height])) {
        width: 100%;
      }
    }

    .post-media_frame .post-media_item {
      grid-area: 1 / 1;
    }

    /* Own colors to be visible on white and black images in any theme */
    .post-media_loader {
      grid-area: 1 / 1;
      place-self: center;
      width: 3.5rem;
      height: 3.5rem;
      background: var(--media-loader-background);
      border-radius: 50%;

      /* Cached image should not blink by the loader */
      animation: --post-media-appear var(--simple-time) 300ms backwards;
    }

    .post-media_track {
      stroke: var(--media-loader-track-color);
    }

    .post-media_spinner {
      stroke: var(--media-loader-color);
      transform-box: fill-box;
      transform-origin: center;
      animation: --post-media-spin 1.5s linear infinite;

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    }

    @keyframes --post-media-appear {
      from {
        opacity: 0%;
      }
    }

    @keyframes --post-media-spin {
      to {
        transform: rotate(1turn);
      }
    }

    video.post-media_item,
    video.post-media_item + .post-media_loader,
    .post-media_audio {
      position: relative;
      z-index: 2;
    }

    .post-media_audio {
      width: 100%;
    }

    .post-media_cover {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
