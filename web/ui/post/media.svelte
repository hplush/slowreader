<script lang="ts">
  import { mdiEyeOutline } from '@mdi/js'
  import {
    isMediaCached,
    type ReaderMedia,
    saveData,
    showSensitiveMedia,
    postMessages as t,
    waitsClick
  } from '@slowreader/core'
  import type { Attachment } from 'svelte/attachments'
  import { SvelteSet } from 'svelte/reactivity'

  import { waitImageDecoded } from '../../lib/image.ts'
  import BrokenImage from '../broken-image.svelte'
  import Button from '../button.svelte'
  import ClickToLoad from '../click-to-load.svelte'

  let {
    media,
    warningClicked = false
  }: { media: ReaderMedia[]; warningClicked?: boolean } = $props()

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
  {#each item.sources ?? [] as source (source.url)}
    <source src={source.url} type={source.type} />
  {/each}
  <source src={item.url} />
{/snippet}

{#if media.length > 0}
  <div class="post-media" class:is-hidden={hidden}>
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
        {:else if item.type.startsWith('image')}
          <img
            class="post-media_item"
            class:is-loading={!loaded.has(item.url)}
            {@attach focusClicked(item.url)}
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
            src={item.url}
            title={item.alt}
            width={item.size?.width}
          />
        {:else if item.type.endsWith(';mode=gif')}
          <video
            class="post-media_item"
            {@attach focusClicked(item.url)}
            aria-label={item.alt}
            autoplay
            disablepictureinpicture
            height={item.size?.height}
            loop
            muted
            playsinline
            poster={item.poster}
            title={item.alt}
            width={item.size?.width}
          >
            {@render sources(item)}
          </video>
        {:else if item.type.startsWith('video')}
          <!-- svelte-ignore a11y_media_has_caption: feeds have no captions -->
          <video
            class="post-media_item"
            {@attach focusClicked(item.url)}
            aria-label={item.alt}
            autoplay={clicked === item.url}
            controls
            height={item.size?.height}
            playsinline
            poster={$saveData ? undefined : item.poster}
            preload="none"
            title={item.alt}
            width={item.size?.width}
          >
            {@render sources(item)}
          </video>
        {:else if item.type.startsWith('audio')}
          <audio
            class="post-media_audio"
            aria-label={item.alt}
            controls
            preload="none"
            src={item.url}
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

      &.is-loading {
        background: --tune-background(--image-placeholder);

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

    video.post-media_item,
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
