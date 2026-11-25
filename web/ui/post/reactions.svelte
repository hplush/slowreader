<script lang="ts">
  import { mdiChevronRight, mdiOpenInNew } from '@mdi/js'
  import { type FeedPopup, getPopupId, router } from '@slowreader/core'
  import type { StoreValue } from 'nanostores'

  import { getPopupHash } from '../../stores/url-router.ts'
  import Icon from '../icon.svelte'
  import PageIcon from '../page-icon.svelte'

  let {
    empty,
    icon,
    list
  }: {
    empty: string
    icon: string
    list: StoreValue<FeedPopup['reactions']>
  } = $props()
</script>

{#if list.length > 0}
  <ul class="post-reactions" role="list">
    {#each list as reaction (reaction.id)}
      <li>
        <a
          class="post-reactions_link"
          aria-controls={reaction.popup
            ? getPopupId('post', reaction.popup)
            : null}
          href={reaction.popup
            ? getPopupHash($router, 'post', reaction.popup)
            : reaction.url}
          rel={reaction.popup ? null : 'noopener'}
          target={reaction.popup ? null : '_blank'}
        >
          <span class="post-reactions_title">{reaction.title}</span>
          <span class="post-reactions_date">{reaction.reactedAt}</span>
          <Icon path={reaction.popup ? mdiChevronRight : mdiOpenInNew} />
        </a>
      </li>
    {/each}
  </ul>
{:else}
  <div class="post-reactions_empty">
    <PageIcon padding={false} path={icon}>{empty}</PageIcon>
  </div>
{/if}

<style lang="postcss">
  :global {
    .post-reactions {
      width: stretch;
      list-style: none;
    }

    .post-reactions_link {
      @mixin clickable;

      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 0.875rem var(--control-padding);
      margin-top: calc(-1 * var(--min-size));
      font: var(--control-font);
      background: --tune-background(--flat-button);
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);

      li:first-child > & {
        margin-top: 0;
        border-radius: var(--base-radius) var(--base-radius) 0 0;
      }

      li:last-child > & {
        border-radius: 0 0 var(--base-radius) var(--base-radius);
      }

      li:last-child:first-child > & {
        border-radius: var(--base-radius);
      }

      &:hover,
      &:active,
      &:focus-visible {
        background: --tune-background(--flat-button --flat-button-hover);
      }

      &:active {
        box-shadow: var(--pressed-shadow);
      }
    }

    .post-reactions_title {
      flex: 1 1 0;
      min-width: 0;
      overflow-wrap: anywhere;
    }

    .post-reactions_empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: stretch;
      padding-top: 1rem;
    }

    .post-reactions_date {
      flex-shrink: 0;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
    }
  }
</style>
