<script lang="ts" module>
  export interface Link<ItemValue> {
    avatar?: { icon: string; url: null | string }
    controls?: string
    hint?: string
    href: string
    id: string
    item: ItemValue
    mark?: string
    markTitle?: string
    variant?: 'dangerous' | 'normal' | 'read'
  }
</script>

<script generics="Value extends object" lang="ts">
  import type { Snippet } from 'svelte'

  import Clickable from './clickable.svelte'
  import FeedAvatar from './feed-avatar.svelte'
  import Icon from './icon.svelte'

  let {
    anchor,
    current,
    id,
    item,
    links
  }: {
    anchor: string
    current?: string
    id?: string
    item: Snippet<[Value]>
    links: Link<Value>[]
  } = $props()
</script>

<ul {id} class="links" aria-hidden="true" role="menu">
  {#each links as i (i.id)}
    <li>
      <Clickable
        class={{
          'is-dangerous': i.variant === 'dangerous',
          'is-read': i.variant === 'read',
          'links_item': true
        }}
        aria-controls={i.controls ?? null}
        aria-current={current === i.id ? 'page' : null}
        data-anchor={anchor}
        href={i.href}
        role="menuitem"
        tabindex={-1}
      >
        {#if i.avatar}
          <span class="links_main">
            <FeedAvatar avatar={i.avatar.url} icon={i.avatar.icon} />
            {@render item(i.item)}
          </span>
        {:else}
          {@render item(i.item)}
        {/if}
        {#if i.hint}
          <span class="links_hint">{i.hint}</span>
        {/if}
        {@const icon = i.mark}
        {#if icon}
          <div class="links_mark" title={i.markTitle}>
            <Icon path={icon} />
          </div>
        {/if}
      </Clickable>
    </li>
  {/each}
</ul>

<style lang="postcss">
  :global {
    .links {
      width: stretch;
      list-style: none;
    }

    .links_item {
      @mixin clickable;

      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem var(--control-padding);
      margin-top: calc(-1 * var(--min-size));
      font: var(--control-font);
      overflow-wrap: anywhere;
      background: --tune-background(--flat-button);
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);

      li:first-child & {
        margin-top: 0;
      }

      li:not(:last-child) > & {
        border-bottom: none;
      }

      @media (--mobile) {
        margin-inline: calc(-1 * var(--page-padding));
        padding-inline: var(--page-padding);
        border-inline: none;
      }

      @media (--no-mobile) {
        li:first-child & {
          margin-top: 0;
          border-radius: var(--base-radius) var(--base-radius) 0 0;
        }

        li:last-child & {
          border-radius: 0 0 var(--base-radius) var(--base-radius);
        }

        li:last-child:first-child & {
          border-radius: var(--base-radius);
        }
      }

      &:hover,
      &:active,
      &:focus-visible {
        background: --tune-background(--flat-button --flat-button-hover);
      }

      &.is-read {
        color: var(--secondary-text-color);
        background: var(--current-background);

        &:not([aria-current='page']) {
          &:hover,
          &:active,
          &:focus-visible {
            background: --tune-background(--flat-button-hover);
          }
        }
      }

      &.is-dangerous:not([aria-current='page']) {
        background: --tune-background(--flat-button --colorize, --dangerous);

        &:hover,
        &:active,
        &:focus-visible {
          background: --tune-background(
            --flat-button --flat-button-hover --colorize,
            --dangerous
          );
        }
      }

      &:not([aria-current='page']):active {
        z-index: 1;
        padding-block: calc(0.875rem + var(--min-size))
          calc(0.875rem - var(--min-size));
        border-color: transparent;
        box-shadow: var(--pressed-shadow);
      }

      &[aria-current='page'] {
        z-index: 1;
        cursor: default;
        background: --tune-background(--current);
        border-color: transparent;
        box-shadow: var(--current-shadow);
      }
    }

    .links_main {
      display: flex;
      flex: 1 1 auto;
      gap: 0.5rem;
      align-items: center;
      min-width: 0;
    }

    .links_hint {
      flex-shrink: 0;
      align-self: center;
      max-width: 50%;
      margin-inline-start: auto;
      padding-inline-start: 0.5rem;
      overflow: hidden;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
      text-overflow: ellipsis;
      white-space: nowrap;

      .links_item.is-dangerous & {
        color: var(--dangerous-text-color);
      }
    }

    .links_mark {
      display: flex;
      align-items: center;
      margin-inline-end: -0.625rem;

      .links_item:not([aria-current='page']):active & {
        translate: 0 1px;
      }

      .links_item:not([aria-current='page'], .is-read) & {
        opacity: 20%;
      }
    }
  }
</style>
