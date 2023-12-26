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
    {href}
    title={hiddenLabel}
    on:click={onClick}
    on:keyup={onKeyUp}
    on:keydown={onKeyDown}
  >
    {#if icon}
      <UiIcon path={icon} />
    {/if}
    {#if !hiddenLabel}
      <slot />
    {/if}
    {#if hotkey}
      <UiHotkey {hotkey} />
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
    title={hiddenLabel}
    on:click={onClick}
    on:keyup={onKeyUp}
    on:keydown={onKeyDown}
  >
    {#if icon}
      <UiIcon path={icon} />
    {/if}
    {#if !hiddenLabel}
      <slot />
    {/if}
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
    flex-shrink: 0;
    gap: var(--padding-m);
    align-items: center;
    justify-content: center;
    height: var(--control-height);
    padding: 0 var(--padding-l);
    font-weight: 600;
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
    }

    &.is-wide {
      flex-shrink: 1;
      width: 100%;
    }

    &.is-square {
      width: var(--control-height);
      padding-inline: 0;
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
      background: var(--secondary-button-color);
      box-shadow: none;

      &:hover,
      &:focus-visible,
      &:active {
        background: var(--secondary-button-hover-color);
      }

      &:active {
        padding-top: 1px;
        box-shadow: var(--flat-active-shadow);
      }

      &.is-dangerous {
        background: var(--secondary-dangerous-button-color);

        &:hover,
        &:focus-visible,
        &:active {
          background: var(--secondary-dangerous-button-hover-color);
        }
      }
    }
  }
</style>
