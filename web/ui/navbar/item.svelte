<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'

  import { addHotkey } from '../../lib/hotkeys.js'
  import Hotkey from '../hotkey.svelte'
  import Icon from '../icon.svelte'
  import type NavbarSubmenu from './submenu.svelte'

  export let href: string | undefined = undefined
  export let current: boolean
  export let hotkey: string | undefined = undefined
  export let icon: string | undefined = undefined
  export let secondary = false
  export let submenu: NavbarSubmenu | undefined = undefined

  let element: HTMLAnchorElement | HTMLButtonElement

  let dispatch = createEventDispatcher()

  function onClick(e: MouseEvent): void {
    dispatch('click')
    if (e.screenX === 0 && e.screenY === 0) {
      submenu?.focus()
    }
  }

  onMount(() => {
    if (hotkey) {
      return addHotkey(hotkey, element, () => {
        element.click()
      })
    }
  })
</script>

{#if href}
  <a
    bind:this={element}
    class="navbar-item"
    class:is-secondary={secondary}
    aria-current={current ? 'page' : null}
    aria-haspopup={submenu ? 'menu' : null}
    aria-keyshortcuts={hotkey}
    {href}
    role={submenu ? 'mentem' : null}
    tabindex={secondary ? -1 : null}
    on:click={onClick}
  >
    {#if icon}
      <Icon path={icon} />
    {/if}
    <slot />
    {#if hotkey}
      <Hotkey {hotkey} />
    {/if}
  </a>
{:else}
  <button
    bind:this={element}
    class="navbar-item"
    class:is-secondary={secondary}
    aria-current={current ? 'page' : null}
    aria-haspopup={submenu ? 'menu' : null}
    aria-keyshortcuts={hotkey}
    tabindex={secondary ? -1 : null}
    on:click={onClick}
  >
    {#if icon}
      <Icon path={icon} />
    {/if}
    <slot />
    {#if hotkey}
      <Hotkey {hotkey} />
    {/if}
  </button>
{/if}

<style>
  .navbar-item {
    position: relative;
    box-sizing: border-box;
    display: flex;
    gap: var(--padding-m);
    align-items: center;
    justify-content: flex-start;
    height: var(--control-height);
    padding: 0 var(--padding-l);
    font-weight: 600;
    color: var(--text-color);
    text-decoration: none;
    cursor: pointer;
    user-select: none;
    background: transparent;
    border: none;
    border-radius: var(--inner-radius);

    &.is-secondary {
      font-weight: normal;
    }

    &:hover,
    &:focus-visible,
    &:active,
    &[aria-current='page'] {
      background: var(--flat-hover-color);
    }

    &:active {
      padding-top: 1px;
      box-shadow: var(--flat-active-shadow);
    }

    &[aria-current='page'],
    &[aria-current='page']:active {
      padding-top: 0;
      cursor: default;
      background: var(--card-color);
    }
  }

  .navbar-item.is-secondary:focus-visible::after {
    position: absolute;
    inset-block: 0;
    inset-inline-end: var(--padding-m);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    font: var(--hotkey-font);
    color: var(--hotkey-color);
    content: '↵';
  }

  :global(.is-hotkey-disabled) .navbar-item.is-secondary:focus-visible::after {
    display: none;
  }
</style>
