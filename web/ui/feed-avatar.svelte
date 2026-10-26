<script lang="ts">
  import { mdiRss } from '@mdi/js'
  import { updateFeedData } from '@slowreader/core'

  import { waitImageDecoded } from '../lib/image.ts'
  import Icon from './icon.svelte'

  let {
    avatar,
    feedId,
    icon = mdiRss,
    round,
    size = 'small'
  }: {
    avatar: null | string | undefined
    feedId?: string
    icon?: string
    round?: boolean
    size?: 'large' | 'medium' | 'small'
  } = $props()

  let broken = $state<string>()
  let loaded = $state<string>()

  $effect(() => {
    if (!avatar && feedId) void updateFeedData(feedId)
  })
</script>

{#if avatar && broken !== avatar}
  <img
    class="feed-avatar"
    class:is-large={size === 'large'}
    class:is-loading={loaded !== avatar}
    class:is-medium={size === 'medium'}
    class:is-raster={!/^data:image\/svg|\.svg($|[?#])/i.test(avatar)}
    class:is-round={round}
    alt=""
    decoding="async"
    loading="lazy"
    onerror={() => {
      broken = avatar
      if (feedId) void updateFeedData(feedId)
    }}
    onload={async event => {
      let src = avatar
      await waitImageDecoded(event.currentTarget)
      loaded = src
    }}
    referrerpolicy="no-referrer"
    src={avatar}
  />
{:else}
  <span
    class="feed-avatar is-missed"
    class:is-large={size === 'large'}
    class:is-medium={size === 'medium'}
    class:is-round={round}
  >
    <Icon path={icon} />
  </span>
{/if}

<style>
  :global {
    .feed-avatar {
      --icon-size: 1rem;

      display: block;
      flex-shrink: 0;
      width: var(--icon-size);
      height: var(--icon-size);
      object-fit: cover;
      border-radius: 0.1875rem;

      &.is-medium,
      &.is-large {
        border-radius: var(--base-radius);

        &.is-raster {
          object-fit: scale-down;
        }
      }

      &.is-medium {
        --icon-size: 2.5rem;
      }

      &.is-large {
        --icon-size: 3.25rem;
      }

      &.is-round {
        border-radius: 50%;

        &.is-raster {
          object-fit: cover;
        }
      }

      &.is-loading {
        background: --tune-background(--image-placeholder);
      }

      &.is-missed {
        color: var(--secondary-text-color);
      }
    }
  }
</style>
