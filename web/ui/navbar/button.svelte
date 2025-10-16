<script lang="ts">
  import type { Snippet } from 'svelte'

  import Clickable from '../clickable.svelte'
  import Icon from '../icon.svelte'

  let {
    children,
    current,
    focusable = false,
    hasSubmenu = false,
    href,
    icon,
    name,
    onclick,
    size = 'inline'
  }: {
    children?: Snippet
    current?: boolean
    focusable?: boolean
    hasSubmenu?: false | string
    href?: string
    icon?: string
    name: string
    onclick?: () => void
    size?: 'icon' | 'inline'
  } = $props()
</script>

<Clickable
  class={{
    'is-icon': size === 'icon',
    'navbar-button': true
  }}
  aria-controls={hasSubmenu || null}
  aria-current={current ? 'page' : null}
  aria-haspopup={hasSubmenu ? 'menu' : null}
  {href}
  {onclick}
  role="menuitem"
  tabindex={current || focusable ? 0 : -1}
  title={size === 'icon' ? name : null}
>
  <span class="navbar-button_cap">
    {#if icon}
      <Icon path={icon} />
    {/if}
    {#if children}
      {@render children()}
    {/if}
    {#if size === 'inline'}
      {name}
    {/if}
  </span>
</Clickable>

<style>
  :global {
    .navbar-button {
      @mixin clickable;

      position: relative;
      z-index: 3;
      display: flex;
      justify-content: center;
      width: 50%;
      font: var(--control-font);
      color: var(--text-color);
      background: transparent;
      border-radius: var(--base-radius);
      corner-shape: squircle;

      &.is-icon {
        width: var(--control-height);
      }

      &[aria-current='page'] {
        cursor: default;
      }

      &:active:not([aria-current='page']) {
        box-shadow: var(--pressed-shadow);
      }

      &:hover:not([aria-current='page']),
      &:active:not([aria-current='page']),
      &:focus-visible:not([aria-current='page']) {
        background: var(--slider-hover-background);
      }

      &:focus-visible {
        outline-offset: 0;
      }
    }

    .navbar-button_cap {
      box-sizing: border-box;
      display: flex;
      gap: 0.25rem;
      align-items: center;
      justify-content: center;
      height: var(--control-height);

      .navbar-button:active:not([aria-current='page']) & {
        translate: 0 1px;
      }
    }
  }
</style>
