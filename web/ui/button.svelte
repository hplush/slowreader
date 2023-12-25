<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte'

  import { addHotkey, markPressed, unmarkPressed } from '../lib/hotkeys.js'
  import UiHotkey from './hotkey.svelte'
  import UiIcon from './icon.svelte'

  export let icon: string | undefined = undefined
  export let wide: boolean = false
  export let hotkey: string | undefined = undefined
  export let href: string | undefined = undefined
  export let secondary = false

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
    class:is-secondary={secondary}
    class:is-wide={wide}
    {href}
    on:click={onClick}
    on:keyup={onKeyUp}
    on:keydown={onKeyDown}
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
    class="button"
    class:is-secondary={secondary}
    class:is-wide={wide}
    on:click={onClick}
    on:keyup={onKeyUp}
    on:keydown={onKeyDown}
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
  .button {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    gap: var(--padding-m);
    align-items: center;
    justify-content: center;
    height: var(--control-height);
    padding: 0 var(--padding-l);
    font-weight: 600;
    color: var(--text-color);
    text-decoration: none;
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
    }

    &.is-wide {
      width: 100%;
    }

    &:not(.is-secondary) {
      @media (prefers-color-scheme: light) {
        &:active {
          height: calc(var(--control-height) - 2px);
          padding-top: 1px;
          margin: 1px 0;
        }
      }

      @media (prefers-color-scheme: dark) {
        &:active {
          height: calc(var(--control-height) - 1px);
          padding-top: 2px;
          margin-bottom: 1px;
        }
      }
    }

    &.is-secondary {
      background: var(--secondary-button-color);
      box-shadow: none;

      &:hover {
        background: var(--secondary-button-hover-color);
      }

      &:active {
        padding-top: 1px;
        box-shadow: var(--flat-active-shadow);
      }
    }
  }
</style>
