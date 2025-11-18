<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { KeyboardEventHandler } from 'svelte/elements'

  import Clickable from '../clickable.svelte'
  import Icon from '../icon.svelte'

  let {
    children,
    current,
    href,
    icon,
    name,
    number,
    onclick
  }: {
    children?: Snippet
    current?: boolean
    href?: string
    icon?: string
    name: string
    number?: number
    onclick?: () => void
  } = $props()
</script>

<Clickable
  class="navbar-item"
  aria-controls="page"
  aria-current={current ? 'page' : null}
  {href}
  {onclick}
  onkeydown={(e => {
    if (e.key === 'Enter') {
      let item = e.currentTarget
      setTimeout(() => {
        item.tabIndex = -1
      }, 10)
    }
  }) as KeyboardEventHandler<HTMLAnchorElement | HTMLButtonElement>}
  role="menuitem"
  tabindex={-1}
  title={name && name.length > 15 ? name : null}
>
  <span class="navbar-item_cap">
    {#if icon}
      <div class="navbar-item_icon">
        <Icon path={icon} />
      </div>
    {/if}
    {#if children}
      {@render children()}
    {/if}
    <div class="navbar-item_text">{name}</div>
    {#if number}
      <div class="navbar-item_number">{number}</div>
    {/if}
  </span>
</Clickable>

<style>
  :global {
    .navbar-item {
      @mixin clickable;

      position: relative;
      display: block;
      height: var(--control-height);
      overflow: hidden;
      font: var(--text-font);
      color: var(--text-color);
      border-radius: var(--base-radius);

      &:hover,
      &:focus-visible,
      &:active {
        background: --tune-background(--flat-button);
      }

      &[aria-current='page'] {
        z-index: 2;
        background: --tune-background(--current);
        box-shadow: var(--current-shadow);
      }

      @media (--desktop) {
        &:active:not([aria-current='page']) {
          box-shadow: var(--pressed-shadow);
        }
      }

      @media (--no-desktop) {
        &:active {
          background: --tune-background(--flat-button);
          box-shadow: var(--pressed-shadow);
        }
      }

      @media (--desktop) {
        &[aria-current='page'] {
          cursor: default;
        }
      }
    }

    .navbar-item_cap {
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: stretch;
      height: var(--control-height);
      padding: 0 0.625rem;

      .navbar-item:not([aria-current='page']):active & {
        translate: 0 1px;
      }

      @media (--no-desktop) {
        .navbar-item:active & {
          translate: 0 1px;
        }
      }
    }

    .navbar-item_icon {
      padding-inline-end: 0.5rem;
    }

    .navbar-item_text {
      flex-grow: 1;
      flex-shrink: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 2;
      white-space: nowrap;
    }

    .navbar-item_number {
      margin-inline-end: -0.375rem;
      font: var(--tertiary-font);
      color: var(--secondary-text-color);
    }
  }
</style>
