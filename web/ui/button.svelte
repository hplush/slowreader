<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import UiIcon from './icon.svelte'

  export let icon: string | undefined = undefined
  export let wide: boolean = false

  let dispatch = createEventDispatcher()

  function onClick(): void {
    dispatch('click')
  }
</script>

<button class="button" class:is-wide={wide} on:click={onClick}>
  {#if icon}
    <UiIcon path={icon} />
  {/if}
  <slot />
</button>

<style>
  .button {
    box-sizing: border-box;
    display: inline-flex;
    gap: var(--padding-m);
    align-items: center;
    justify-content: center;
    height: var(--control-height);
    padding: 0 var(--padding-l);
    font-weight: 600;
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
      padding-top: 2px;
      box-shadow: var(--button-active-shadow);
    }

    &.is-wide {
      width: 100%;
    }
  }
</style>
