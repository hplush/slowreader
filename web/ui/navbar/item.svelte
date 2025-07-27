<script lang="ts">
  import type { Snippet } from 'svelte'

  import Clickable from '../clickable.svelte'
  import Icon from '../icon.svelte'

  let {
    children,
    current,
    hasSubmenu = false,
    href,
    icon,
    inSubmenu = false,
    name,
    onclick,
    size = 'inline'
  }: {
    current?: boolean
    hasSubmenu?: false | string
    href?: string
    inSubmenu?: boolean
    name: string
    onclick?: () => void
  } & (
    | { children: Snippet; icon?: undefined; size: 'icon' }
    | { children?: Snippet; icon?: string; size?: 'inline' }
    | { children?: undefined; icon: string; size: 'icon' }
  ) = $props()
</script>

<Clickable
  class={{
    'is-icon': size === 'icon',
    'navbar-item': true
  }}
  aria-controls={hasSubmenu || 'page'}
  aria-current={current ? 'page' : null}
  aria-haspopup={hasSubmenu ? 'menu' : null}
  {href}
  {onclick}
  role="menuitem"
  tabindex={!inSubmenu && current ? 0 : -1}
  title={size === 'icon' || (name && name.length > 15) ? name : null}
>
  <span class="navbar-item_cap">
    {#if icon}
      <Icon path={icon} />
    {/if}
    {#if children}
      {@render children()}
    {/if}
    {#if size !== 'icon'}
      <div class="navbar-item_text">{name}</div>
    {/if}
  </span>
</Clickable>

<style>
  :global {
    .navbar-item {
      position: relative;
      display: block;
      height: var(--navbar-item);
      overflow: hidden;
      font: var(--control-font);
      color: var(--text-color);
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      background: transparent;
      border: none;
      border-radius: var(--base-radius);

      &:hover,
      &:focus-visible,
      &:active {
        background: --tune-background(--secondary);
      }

      &&:active {
        box-shadow: var(--pressed-shadow);
      }

      &[aria-current='page'] {
        color: var(--current-background);
        background: var(--text-color);
      }

      @media (width > 64rem) {
        &[aria-current='page'] {
          cursor: default;
        }
      }
    }

    .navbar-item_cap {
      box-sizing: border-box;
      display: flex;
      gap: 0.4rem;
      align-items: center;
      justify-content: flex-start;
      height: var(--navbar-item);
      padding: 0 0.5rem;

      .navbar-item.is-icon & {
        justify-content: center;
        width: var(--navbar-item);
        padding: 0;
      }

      .navbar-item:active & {
        translate: 0 1px;
      }
    }

    .navbar-item_text {
      flex-shrink: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 2;
      white-space: nowrap;
    }
  }
</style>
