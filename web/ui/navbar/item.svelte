<script lang="ts">
  import type { Snippet } from 'svelte'

  import Hotkey from '../hotkey.svelte'
  import Icon from '../icon.svelte'

  let {
    children,
    current,
    hotkey,
    href,
    icon,
    name,
    onclick,
    secondary = false,
    small = false,
    submenu = false
  }: {
    children?: Snippet
    current: boolean
    hotkey?: string
    href?: string
    icon?: string
    name?: string
    onclick?: () => void
    secondary?: boolean
    small?: boolean
    submenu?: boolean
  } = $props()
</script>

{#snippet content()}
  {#if icon}
    <Icon path={icon} />
  {/if}
  {#if small}
    {#if children}
      {@render children()}
    {/if}
  {:else}
    <span class="navbar-item_text">
      {#if name}
        {name}
      {:else if children}
        {@render children()}
      {/if}
    </span>
  {/if}
  {#if hotkey}
    <Hotkey {hotkey} />
  {/if}
{/snippet}

{#if href}
  <a
    class="navbar-item"
    class:is-small={small}
    aria-controls={submenu ? 'navbar_submenu' : 'page'}
    aria-current={current ? 'page' : null}
    aria-haspopup={submenu ? 'menu' : null}
    aria-keyshortcuts={hotkey}
    {href}
    {onclick}
    role="menuitem"
    tabindex={secondary || !current ? -1 : null}
    title={small || (name && name.length > 15) ? name : null}
  >
    {@render content()}
  </a>
{:else}
  <button
    class="navbar-item"
    class:is-small={small}
    aria-controls={submenu ? 'navbar_submenu' : 'page'}
    aria-current={current ? 'page' : null}
    aria-haspopup={submenu ? 'menu' : null}
    aria-keyshortcuts={hotkey}
    {onclick}
    role="menuitem"
    tabindex={secondary ? -1 : null}
    title={small || (name && name.length > 15) ? name : null}
  >
    {@render content()}
  </button>
{/if}

<style>
  .navbar-item {
    position: relative;
    box-sizing: border-box;
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: flex-start;
    height: var(--navbar-item);
    padding-inline: 13px 8px;
    overflow: hidden;
    font: var(--control-font);
    font-weight: normal;
    color: var(--text-color);
    text-decoration: none;
    cursor: pointer;
    user-select: none;
    background: transparent;
    border: none;
    border-radius: var(--radius);
    outline-offset: -3px;

    &.is-small {
      justify-content: center;
      width: var(--navbar-item);
      height: var(--navbar-item);
      padding: 0;
    }

    &:hover,
    &:focus-visible,
    &:active,
    &[aria-current='page'] {
      background: var(--flat-hover-color);
    }

    &[aria-current='page'] {
      cursor: default;
      background: var(--flat-current-color);
    }

    &:active {
      padding-top: 1px;
      background: var(--flat-current-color);
      box-shadow: var(--below-1-shadow);
    }

    @media (width <= 1024px) {
      &[aria-current='page'] {
        cursor: pointer;
      }
    }
  }

  .navbar-item_text {
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
