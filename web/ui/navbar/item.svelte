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
  tabindex={inSubmenu ? -1 : null}
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
      <span class="navbar-item_text">{name}</span>
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
      font-weight: normal;
      line-height: 1;
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

      @media (width <= 64rem) {
        &[aria-current='page'] {
          cursor: pointer;
        }
      }
    }

    .navbar-item_cap {
      box-sizing: border-box;
      display: flex;
      gap: 0.375rem;
      align-items: center;
      justify-content: center;
      height: var(--navbar-item);

      .navbar-item.is-icon & {
        justify-content: center;
        width: var(--navbar-item);
        text-align: center;
      }

      .navbar-item:active & {
        translate: 0 1px;
      }
    }

    .navbar-item_text {
      flex-shrink: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
