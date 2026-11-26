<script lang="ts">
  import {
    mdiClose,
    mdiEyeOutline,
    mdiFileOutline,
    mdiMusicNote,
    mdiOpenInNew,
    mdiPlay,
    mdiVolumeOff
  } from '@mdi/js'
  import {
    canAutoplayVideos,
    commonMessages,
    formatSize,
    i18nFormat,
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
  import { SvelteMap, SvelteSet } from 'svelte/reactivity'

  import { blurredBackground, waitImageDecoded } from '../../lib/image.ts'
  import {
    canStreamMedia,
    mediaSrc,
    playIfVisible,
    watchVideo
  } from '../../lib/media.ts'
  import BrokenImage from '../broken-image.svelte'
  import Button from '../button.svelte'
  import ClickToLoad from '../click-to-load.svelte'
  import Clickable from '../clickable.svelte'
  import Icon from '../icon.svelte'

  let {
    media,
    postUrl,
    protect = false,
    published,
    warningClicked = false
  }: {
    media: ReaderMedia[]
    postUrl?: string
    protect?: boolean | null
    published?: null | number
    warningClicked?: boolean
  } = $props()

  function blockSaving(event: Event): void {
    if (protect) event.preventDefault()
  }

  function playAfterClick(url: string, video: HTMLVideoElement): void {
    if (clicked === url && video.paused) playIfVisible(video)
  }

  function hiddenControls(item: ReaderMedia): string | undefined {
    if (protect) return 'nodownload noremoteplayback'
    if (isLoaderMedia(item.url)) return 'nodownload'
    return undefined
  }

  function isRound(item: ReaderMedia): boolean {
    return item.type.endsWith(';mode=round')
  }

  function isSticker(item: ReaderMedia): boolean {
    return item.type.endsWith(';mode=sticker')
  }

  function trackPlayback(url: string, video: HTMLVideoElement): void {
    if (video.paused) playback.set(url, 'paused')
    else playback.set(url, video.muted ? 'muted' : 'voiced')
  }

  function toggleRound(button: HTMLElement): void {
    let video = button.parentElement!.querySelector('video')!
    if (!video.paused && !video.muted) {
      video.pause()
      return
    }
    if (video.muted) {
      video.muted = false
      video.currentTime = 0
    }
    video.play().catch(() => {})
  }

  function stopLoading(url: string): void {
    clicked = undefined
    stopped = url
    declined.add(url)
    downloaded.delete(url)
  }

  let broken = new SvelteSet<string>()
  let loaded = new SvelteSet<string>()
  let downloaded = new SvelteSet<string>()
  let declined = new SvelteSet<string>()
  let autoloaded = new Set<string>()
  let autoplayed = new SvelteSet<string>()
  let playback = new SvelteMap<string, 'muted' | 'paused' | 'voiced'>()
  let revealed = $state(false)
  let clicked = $state<string>()
  let stopped = $state<string>()

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

  function shownPoster(item: ReaderMedia): string | undefined {
    if (!item.poster) return undefined
    return !$saveData || downloaded.has(item.poster) ? item.poster : undefined
  }

  function autoplay(item: ReaderMedia): Attachment<HTMLElement> {
    return watchVideo({
      auto:
        $canAutoplayVideos &&
        !hidden &&
        !(item.sensitive && !sensitiveShown) &&
        clicked !== item.url &&
        !declined.has(item.url) &&
        !broken.has(item.url) &&
        (!waitsClick(item, $saveData, downloaded) || canStreamMedia()),
      controls(shown) {
        if (shown) autoplayed.delete(item.url)
        else autoplayed.add(item.url)
      },
      leave() {
        if (autoloaded.delete(item.url) && waitsFile(item)) {
          downloaded.delete(item.url)
        }
      },
      load() {
        autoloaded.add(item.url)
        downloaded.add(item.url)
      }
    })
  }

  $effect(() => {
    if (!$saveData) return
    for (let item of media) {
      for (let url of [item.url, item.poster]) {
        if (!url) continue
        void isMediaCached(url).then(cached => {
          if (cached) downloaded.add(url)
        })
      }
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
    class:is-sticker={isSticker(item)}
    {@attach focusClicked(item.url)}
    {@attach mediaSrc(item.url, {
      copies: item.copies,
      once: !!protect,
      published
    })}
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

{#snippet spinner()}
  <circle
    class="post-media_spinner"
    cx="28"
    cy="28"
    fill="none"
    r="25"
    stroke-dasharray="40 200"
    stroke-linecap="round"
    stroke-width="3.5"
  />
{/snippet}

{#snippet loader()}
  <svg
    class="post-media_loader"
    {@attach () => reportLoader('media')}
    aria-label={$commonMessages.loading}
    role="progressbar"
    viewBox="0 0 56 56"
  >
    {@render spinner()}
  </svg>
{/snippet}

{#snippet stop(url: string)}
  <Clickable
    class="post-media_stop"
    aria-label={$t.stopLoading}
    onclick={() => {
      stopLoading(url)
    }}
    title={$t.stopLoading}
  >
    <svg
      class="post-media_ring"
      {@attach () => reportLoader('media')}
      aria-hidden="true"
      viewBox="0 0 56 56"
    >
      {@render spinner()}
    </svg>
    <Icon path={mdiClose} />
  </Clickable>
{/snippet}

{#snippet toggle(item: ReaderMedia)}
  {@const state = playback.get(item.url) ?? 'paused'}
  {@const label = {
    muted: $t.playWithSound,
    paused: $t.playVideo,
    voiced: $t.pauseVideo
  }[state]}
  <Clickable
    class="post-media_toggle"
    {@attach (button: HTMLElement) => {
      if (clicked === item.url) button.focus({ preventScroll: true })
    }}
    aria-label={label}
    onclick={(event: { currentTarget: HTMLElement }) => {
      toggleRound(event.currentTarget)
    }}
    title={label}
  >
    {#if state === 'paused'}
      <span class="post-media_play">
        <Icon path={mdiPlay} />
      </span>
    {:else if state === 'muted'}
      <span class="post-media_muted">
        <Icon path={mdiVolumeOff} />
      </span>
    {/if}
  </Clickable>
{/snippet}

{#snippet video(item: ReaderMedia)}
  <!-- svelte-ignore a11y_media_has_caption: feeds have no captions -->
  <video
    class="post-media_item"
    class:is-round={isRound(item)}
    {@attach focusClicked(item.url)}
    {@attach mediaSrc(item.url, { published, stream: true, web: false })}
    {@attach mediaSrc(shownPoster(item), { attribute: 'poster' })}
    {@attach () => () => {
      autoplayed.delete(item.url)
    }}
    aria-busy={waitsFile(item)}
    aria-label={item.alt}
    autoplay={clicked === item.url && !isLoaderMedia(item.url)}
    controls={!isRound(item) && !waitsFile(item) && !autoplayed.has(item.url)}
    controlslist={hiddenControls(item)}
    disablepictureinpicture={!!protect}
    height={item.size?.height}
    onerror={() => {
      broken.add(item.url)
    }}
    onloadstart={event => {
      loaded.add(item.url)
      playAfterClick(item.url, event.currentTarget)
    }}
    onpause={event => {
      trackPlayback(item.url, event.currentTarget)
    }}
    onplay={event => {
      trackPlayback(item.url, event.currentTarget)
    }}
    onvolumechange={event => {
      trackPlayback(item.url, event.currentTarget)
    }}
    playsinline
    preload="none"
    title={item.alt}
    width={item.size?.width}
  >
    {@render sources(item)}
  </video>
{/snippet}

{#snippet click(item: ReaderMedia)}
  {@const scale = isSticker(item)
    ? 192 / Math.max(item.size?.width ?? 0, item.size?.height ?? 0, 192)
    : 1}
  <ClickToLoad
    alt={item.alt}
    bytes={item.size?.approximate ? undefined : item.size?.bytes}
    focus={stopped === item.url}
    height={item.size?.height && item.size.height * scale}
    onload={() => {
      if (item.sensitive) revealed = true
      clicked = item.url
      stopped = undefined
      downloaded.add(item.url)
    }}
    placeholder={item.sensitive && !sensitiveShown
      ? undefined
      : item.placeholder}
    play={item.type.startsWith('video') && !item.type.endsWith(';mode=gif')}
    poster={item.sensitive && !sensitiveShown ? undefined : shownPoster(item)}
    round={isRound(item)}
    sensitive={!!item.sensitive && !sensitiveShown}
    url={item.url}
    video={!item.type.startsWith('image')}
    width={item.size?.width && item.size.width * scale}
  />
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
        {#if item.type.startsWith('video') && !item.type.endsWith(';mode=gif')}
          <span class="post-media_frame" {@attach autoplay(item)}>
            {#if waitsClick(item, $saveData, downloaded)}
              {@render click(item)}
            {:else}
              {@render video(item)}
              {#if waitsFile(item)}
                {@render stop(item.url)}
              {:else if isRound(item)}
                {@render toggle(item)}
              {/if}
            {/if}
          </span>
        {:else if waitsClick(item, $saveData, downloaded)}
          {@render click(item)}
        {:else if item.type.startsWith('image') && broken.has(item.url)}
          <span
            style:width={item.size?.width && `${item.size.width}px`}
            style:aspect-ratio={item.size?.width &&
              item.size.height &&
              `${item.size.width} / ${item.size.height}`}
            class="post-media_item is-broken"
            class:is-sticker={isSticker(item)}
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
            {@attach mediaSrc(item.url, { published, web: false })}
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
        {:else if item.type.startsWith('audio') && !isLoaderMedia(item.url)}
          <audio
            class="post-media_audio"
            {@attach mediaSrc(item.url)}
            aria-label={item.alt}
            controls
            preload="none"
            title={item.alt}
          ></audio>
        {:else}
          <a
            class="post-media_file"
            href={isLoaderMedia(item.url) ? postUrl : item.url}
            rel="noopener"
            target="_blank"
          >
            <Icon
              path={item.type.startsWith('audio')
                ? mdiMusicNote
                : mdiFileOutline}
            />
            <span class="post-media_name">
              {item.name ??
                (item.type.startsWith('audio') ? $t.audioFile : $t.file)}
            </span>
            {#if item.size?.bytes}
              <span class="post-media_bytes">
                {formatSize($i18nFormat, item.size.bytes)}
              </span>
            {/if}
            {#if isLoaderMedia(item.url)}
              <span class="sr-only">{$t.openInApp}</span>
            {/if}
            <Icon path={mdiOpenInNew} />
          </a>
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

      &.is-sticker {
        max-width: 12rem;
        max-height: 12rem;
        object-fit: contain;
        background: none;
        border-radius: 0;
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

    .post-media_item.is-round {
      aspect-ratio: 1;
      object-fit: cover;
      border-radius: 50%;
    }

    .post-media_toggle {
      @mixin clickable;

      position: relative;
      z-index: 2;
      display: flex;
      grid-area: 1 / 1;
      align-items: center;
      justify-content: center;
      padding: 0;
      border-radius: 50%;

      &:focus-visible {
        outline-offset: -5px;
      }

      html:not(.is-quiet-cursor) & {
        cursor: pointer;
      }
    }

    .post-media_play {
      --icon-size: 1.75rem;

      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      color: var(--media-loader-color);
      background: var(--media-loader-background);
      border-radius: 50%;

      .post-media_toggle:hover &,
      .post-media_toggle:focus-visible & {
        background: var(--media-loader-hover-background);
      }
    }

    .post-media_muted {
      --icon-size: 1rem;

      display: flex;
      align-items: center;
      align-self: flex-end;
      justify-content: center;
      width: 1.5rem;
      height: 1.5rem;
      margin-bottom: 0.5rem;
      color: var(--media-loader-color);
      background: var(--media-loader-background);
      border-radius: 50%;

      .post-media_toggle:hover &,
      .post-media_toggle:focus-visible & {
        background: var(--media-loader-hover-background);
      }
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

    .post-media_stop {
      @mixin clickable;

      --icon-size: 1.5rem;

      position: relative;
      z-index: 2;
      display: flex;
      grid-area: 1 / 1;
      place-self: center;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      padding: 0;
      color: var(--media-loader-color);
      background: var(--media-loader-background);
      border-radius: 50%;
      animation: --post-media-appear var(--simple-time) 300ms backwards;

      &:hover,
      &:focus-visible {
        background: var(--media-loader-hover-background);
      }

      html:not(.is-quiet-cursor) & {
        cursor: pointer;
      }
    }

    .post-media_ring {
      position: absolute;
      inset: 0;
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

    .post-media_file {
      @mixin clickable;

      --icon-size: 1.25rem;

      position: relative;
      z-index: 2;
      box-sizing: border-box;
      display: flex;
      gap: 0.5rem;
      align-items: center;
      width: 100%;
      min-height: var(--control-height);
      padding: 0.375rem 0.625rem;
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);
      border-radius: var(--base-radius);

      &:hover .post-media_name,
      &:focus-visible .post-media_name {
        text-decoration: underline;
      }

      &:focus-visible {
        outline-offset: -3px;
      }
    }

    .post-media_name {
      flex: 1 1 0;
      min-width: 0;
      overflow-wrap: anywhere;
      font: var(--secondary-title-font);
    }

    .post-media_bytes {
      font: var(--secondary-font);
      color: var(--secondary-text-color);
      white-space: nowrap;
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
