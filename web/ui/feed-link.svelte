<script lang="ts">
  import { mdiTune } from '@mdi/js'

  import FeedAvatar from './feed-avatar.svelte'
  import Icon from './icon.svelte'

  let {
    anchor,
    avatar,
    avatarRound,
    avatarSize,
    edit,
    feedId,
    handle,
    href,
    title,
    variant = 'main'
  }: {
    anchor?: string
    avatarSize?: 'medium' | 'small'
    edit?: string
    handle?: string
    href: string
    title: string
    variant?: 'main' | 'secondary'
  } & (
    | { avatar: null | string; avatarRound: boolean; feedId: string }
    | { avatar?: undefined; avatarRound?: undefined; feedId?: undefined }
  ) = $props()
</script>

<div
  class="feed-link"
  class:is-editable={!!edit}
  class:is-secondary={variant === 'secondary'}
>
  <a class="feed-link_link" data-anchor={anchor ?? null} {href}>
    {#if feedId !== undefined}
      <FeedAvatar {avatar} {feedId} round={avatarRound} size={avatarSize} />
    {/if}
    {#if handle}
      <span class="feed-link_names">
        <span class="feed-link_text">{title}</span>
        <span class="feed-link_handle">{handle}</span>
      </span>
    {:else}
      <span class="feed-link_text">{title}</span>
    {/if}
    {#if edit}
      <span class="feed-link_edit">
        <Icon path={mdiTune} />
      </span>
      <span class="sr-only">{edit}</span>
    {/if}
  </a>
</div>

<style lang="postcss">
  :global {
    .feed-link {
      flex: 1 1 0;
      min-width: 0;
      contain: inline-size;
    }

    .feed-link_link {
      @mixin clickable;

      display: flex;
      gap: 0.5rem;
      align-items: center;
      max-width: 100%;
      height: var(--control-height);
      font: var(--text-font);
      color: var(--text-color);
      border-radius: var(--base-radius);

      .feed-link.is-secondary & {
        height: auto;
        padding: 0;
        font: var(--secondary-font);
        color: var(--secondary-text-color);
      }

      &:hover,
      &:active,
      &:focus-visible {
        text-decoration: underline;
      }

      &:active {
        translate: 0 1px;
      }

      .feed-link.is-editable & {
        width: fit-content;
        padding-inline: 0.5rem;
        margin-inline-start: -0.5rem;

        &:hover,
        &:active,
        &:focus-visible {
          text-decoration: none;
          background: --tune-background(--flat-button --flat-button-hover);
        }

        &:active {
          box-shadow: var(--pressed-shadow);
        }
      }
    }

    .feed-link_edit {
      flex-shrink: 0;
      margin-inline-start: -0.125rem;
    }

    .feed-link_names {
      display: flex;
      flex-direction: column;
      flex-shrink: 1;
      align-self: flex-start;
      min-width: 0;
      color: var(--text-color);
    }

    .feed-link_text {
      flex-shrink: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .feed-link_handle {
      overflow: hidden;
      text-overflow: ellipsis;
      font: var(--tertiary-font);
      line-height: 1.4;
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
  }
</style>
