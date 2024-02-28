<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import Hotkey from '../hotkey.svelte'
  import Icon from '../icon.svelte'

  export let href: string | undefined = undefined
  export let current: boolean
  export let name: string | undefined = undefined
  export let hotkey: string | undefined = undefined
  export let icon: string | undefined = undefined
  export let secondary = false
  export let submenu = false
  export let small = false

  let dispatch = createEventDispatcher()

  function onClick(): void {
    dispatch('click')
  }
</script>

{#if href}
  <a
    class="navbar-item"
    class:is-small={small}
    aria-controls={submenu ? 'navbar_submenu' : 'page'}
    aria-current={current ? 'page' : null}
    aria-haspopup={submenu ? 'menu' : null}
    aria-keyshortcuts={hotkey}
    {href}
    role="menuitem"
    tabindex={secondary || !current ? -1 : null}
    title={small || (name && name.length > 15) ? name : null}
    on:click={onClick}
  >
    {#if icon}
      <Icon path={icon} />
    {/if}
    {#if !small}
      <span class="navbar-item_text">
        {#if name}
          {name}
        {:else}
          <slot />
        {/if}
      </span>
    {:else}
      <slot />
    {/if}
    {#if hotkey}
      <Hotkey {hotkey} />
    {/if}
  </a>
{:else}
  <button
    class="navbar-item"
    class:is-small={small}
    aria-controls={submenu ? 'navbar_submenu' : 'page'}
    aria-current={current ? 'page' : null}
    aria-haspopup={submenu ? 'menu' : null}
    aria-keyshortcuts={hotkey}
    role="menuitem"
    tabindex={secondary ? -1 : null}
    title={small || (name && name.length > 15) ? name : null}
    on:click={onClick}
  >
    {#if icon}
      <Icon path={icon} />
    {/if}
    {#if !small}
      <span class="navbar-item_text">
        {#if name}
          {name}
        {:else}
          <slot />
        {/if}
      </span>
    {:else}
      <slot />
    {/if}
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
    padding: var(--padding-m) 13px;
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

    &.is-small {
      justify-content: center;
      height: auto;
      aspect-ratio: 1;
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
      background: var(--card-color);
    }

    &:active {
      box-shadow: var(--flat-active-shadow);

      & > * {
        transform: translateY(1px);
      }
    }
  }

  .navbar-item_text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
