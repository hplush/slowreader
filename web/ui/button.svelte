<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'

  import { addHotkey, markPressed, unmarkPressed } from '../lib/hotkeys.js'
  import Hotkey from './hotkey.svelte'
  import Icon from './icon.svelte'

  export let icon: string | undefined = undefined
  export let wide: boolean = false
  export let hotkey: string | undefined = undefined
  export let href: string | undefined = undefined
  export let secondary = false
  export let hiddenLabel: string | undefined = undefined
  export let dangerous = false

  let element: HTMLAnchorElement | HTMLButtonElement

  let dispatch = createEventDispatcher()

  function onClick(): void {
    dispatch('click')
  }

  function onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      markPressed(element)
      e.preventDefault()
    }
  }

  function onKeyUp(e: KeyboardEvent): void {
    unmarkPressed()
    if (e.key === 'Enter') {
      element.click()
    }
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
    class="button"
    class:is-dangerous={dangerous}
    class:is-secondary={secondary}
    class:is-square={hiddenLabel}
    class:is-wide={wide}
    aria-keyshortcuts={hotkey}
    {href}
    title={hiddenLabel}
    on:click={onClick}
    on:keyup={onKeyUp}
    on:keydown={onKeyDown}
  >
    {#if icon}
      <Icon path={icon} />
    {/if}
    {#if !hiddenLabel}
      <span><slot /></span>
    {/if}
    {#if hotkey}
      <Hotkey {hotkey} />
    {/if}
  </a>
{:else}
  <button
    bind:this={element}
    class="button"
    class:is-dangerous={dangerous}
    class:is-secondary={secondary}
    class:is-square={hiddenLabel}
    class:is-wide={wide}
    aria-keyshortcuts={hotkey}
    title={hiddenLabel}
    type="button"
    on:click={onClick}
    on:keyup={onKeyUp}
    on:keydown={onKeyDown}
  >
    {#if icon}
      <Icon path={icon} />
    {/if}
    {#if !hiddenLabel}
      <span><slot /></span>
    {/if}
    {#if hotkey}
      <Hotkey {hotkey} />
    {/if}
  </button>
{/if}

<style>
  .button {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex-shrink: 0;
    gap: var(--padding-m);
    align-items: center;
    justify-content: center;
    height: var(--control-height);
    padding: 0 var(--padding-l);
    font: var(--control-font);
    color: var(--text-color);
    text-decoration: none;
    text-wrap: nowrap;
    cursor: pointer;
    user-select: none;
    background: var(--card-color);
    border: none;
    border-radius: var(--inner-radius);
    box-shadow: var(--button-shadow);

    &:hover,
    &:focus-visible,
    &:active {
      background: var(--hover-color);
    }

    &:active {
      box-shadow: var(--button-active-shadow);

      & > * {
        transform: translateY(1px);
      }
    }

    &.is-wide {
      flex-shrink: 1;
      width: 100%;
    }

    &.is-square {
      width: var(--control-height);
      padding-inline: 0;
    }

    &.is-dangerous {
      color: var(--dangerous-text-color);
      background: var(--dangerous-card-color);

      &:hover,
      &:focus-visible,
      &:active {
        background: var(--dangerous-card-hover-color);
      }
    }

    &.is-secondary {
      border: 1px solid var(--border-color);
      box-shadow: none;

      &:not(.is-square) {
        padding-inline: calc(var(--padding-l) - 1px);
      }

      &.is-dangerous {
        box-shadow: var(--flat-dangerous-shadow);
      }

      &:active {
        box-shadow: var(--flat-active-shadow);
      }
    }
  }
</style>
