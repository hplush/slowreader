<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import Hotkey from './hotkey.svelte'
  import Icon from './icon.svelte'

  export let icon: string | undefined = undefined
  export let wide: boolean = false
  export let hotkey: string | undefined = undefined
  export let href: string | undefined = undefined
  export let secondary = false
  export let hiddenLabel: string | undefined = undefined
  export let dangerous = false

  let dispatch = createEventDispatcher()

  function onClick(): void {
    dispatch('click')
  }
</script>

{#if href}
  <a
    class="button"
    class:is-dangerous={dangerous}
    class:is-secondary={secondary}
    class:is-square={hiddenLabel}
    class:is-wide={wide}
    aria-keyshortcuts={hotkey}
    {href}
    title={hiddenLabel}
    on:click={onClick}
  >
    {#if !hiddenLabel}
      {#if icon}
        <Icon path={icon} />
      {/if}
      <span><slot /></span>
    {:else}
      {#if icon}
        <div class="button_center">
          <Icon path={icon} />
        </div>
      {/if}
      <span class="button_size" aria-hidden="true">x</span>
    {/if}
    {#if hotkey}
      <Hotkey {hotkey} />
    {/if}
  </a>
{:else}
  <button
    class="button"
    class:is-dangerous={dangerous}
    class:is-secondary={secondary}
    class:is-square={hiddenLabel}
    class:is-wide={wide}
    aria-keyshortcuts={hotkey}
    title={hiddenLabel}
    type="button"
    on:click={onClick}
  >
    {#if !hiddenLabel}
      {#if icon}
        <Icon path={icon} />
      {/if}
      <span><slot /></span>
    {:else}
      {#if icon}
        <div class="button_center">
          <Icon path={icon} />
        </div>
      {/if}
      <span class="button_size" aria-hidden="true">x</span>
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
    gap: var(--padding-m);
    align-items: center;
    justify-content: center;
    padding: var(--padding-m) var(--padding-l);
    font: var(--control-font);
    color: var(--text-color);
    text-decoration: none;
    cursor: pointer;
    user-select: none;
    background: var(--card-color);
    border: none;
    border-radius: var(--radius);
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
      width: auto;
      height: fit-content;
      aspect-ratio: 1;
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

  .button_center {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .button_size {
    visibility: hidden;
  }
</style>
