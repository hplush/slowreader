<script lang="ts">
  import { mdiEyeOutline } from '@mdi/js'
  import { type ReaderMedia, postMessages as t } from '@slowreader/core'

  import Button from '../button.svelte'

  let { media }: { media: ReaderMedia[] } = $props()

  let attached = $derived(media.filter(item => !item.fromText))
  let revealed = $state(false)
  let hidden = $derived(!revealed && attached.some(item => item.sensitive))
</script>

{#if attached.length > 0}
  <div class="post-media" class:is-hidden={hidden}>
    <div class="post-media_list" inert={hidden}>
      {#each attached as item, index (`${item.url}${index}`)}
        {#if item.type.startsWith('image')}
          <img
            class="post-media_item"
            alt={item.alt ?? ''}
            decoding="async"
            height={item.size?.height}
            loading="lazy"
            src={item.url}
            title={item.alt}
            width={item.size?.width}
          />
        {:else if item.type.endsWith(';mode=gif')}
          <video
            class="post-media_item"
            aria-label={item.alt}
            autoplay
            disablepictureinpicture
            height={item.size?.height}
            loop
            muted
            playsinline
            poster={item.poster}
            src={item.url}
            title={item.alt}
            width={item.size?.width}
          ></video>
        {:else if item.type.startsWith('video')}
          <!-- svelte-ignore a11y_media_has_caption: feeds have no captions -->
          <video
            class="post-media_item"
            aria-label={item.alt}
            controls
            height={item.size?.height}
            playsinline
            poster={item.poster}
            preload="none"
            src={item.url}
            title={item.alt}
            width={item.size?.width}
          ></video>
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
      padding-top: 0.625rem;
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
