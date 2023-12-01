<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'

  import { addHotkey } from '../../lib/hotkeys.js'
  import UiHotkey from '../hotkey.svelte'
  import UiIcon from '../icon.svelte'

  export let href: string | undefined = undefined
  export let current: boolean
  export let hotkey: string | undefined = undefined
  export let icon: string | undefined = undefined

  let element: HTMLAnchorElement | HTMLButtonElement

  let dispatch = createEventDispatcher()

  function onClick(): void {
    dispatch('click')
  }

  onMount(() => {
    if (hotkey) {
      return addHotkey(hotkey, element, onClick)
    }
  })
</script>

{#if href}
  <a
    bind:this={element}
    class="navbar-item"
    aria-current={current ? 'page' : null}
    {href}
    on:click={onClick}
  >
    {#if icon}
      <UiIcon path={icon} />
    {/if}
    <slot />
    {#if hotkey}
      <UiHotkey {hotkey} />
    {/if}
  </a>
{:else}
  <button
    bind:this={element}
    class="navbar-item"
    aria-current={current ? 'page' : null}
    on:click={onClick}
  >
    {#if icon}
      <UiIcon path={icon} />
    {/if}
    <slot />
    {#if hotkey}
      <UiHotkey {hotkey} />
    {/if}
  </button>
{/if}

<style>
  .navbar-item {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
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

    &:hover,
    &:focus-visible,
    &:active,
    &[aria-current='page'] {
      background: var(--card-color);
    }

    &:active {
      padding-top: 1px;
      box-shadow: var(--link-active-shadow);
    }

    &[aria-current='page'],
    &[aria-current='page']:active {
      padding-top: 0;
      cursor: default;
      box-shadow: var(--link-pressed-shadow);
    }
  }
</style>
