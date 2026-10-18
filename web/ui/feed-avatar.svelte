<script lang="ts">
  import { mdiRss } from '@mdi/js'
  import { updateFeedAvatar } from '@slowreader/core'

  import Icon from './icon.svelte'

  let {
    avatar,
    feedId,
    size = 'small'
  }: {
    avatar: null | string | undefined
    feedId?: string
    size?: 'large' | 'medium' | 'small'
  } = $props()

  let broken = $state<string>()

  $effect(() => {
    if (!avatar && feedId) void updateFeedAvatar(feedId)
  })
</script>

{#if avatar && broken !== avatar}
  <img
    class="feed-avatar"
    class:is-large={size === 'large'}
    class:is-medium={size === 'medium'}
    class:is-raster={!/^data:image\/svg|\.svg($|[?#])/i.test(avatar)}
    alt=""
    decoding="async"
    loading="lazy"
    onerror={() => {
      broken = avatar
      if (feedId) void updateFeedAvatar(feedId)
    }}
    referrerpolicy="no-referrer"
    src={avatar}
  />
{:else}
  <span
    class="feed-avatar is-missed"
    class:is-large={size === 'large'}
    class:is-medium={size === 'medium'}
  >
    <Icon path={mdiRss} />
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

      &.is-missed {
        color: var(--secondary-text-color);
      }
    }
  }
</style>
