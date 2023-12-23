<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  import { generateMenuListeners } from '../lib/hotkeys.js'

  export let node: HTMLUListElement | null = null

  let dispatch = createEventDispatcher<{ enter: null }>()

  let [onKeyDown, onKeyUp] = generateMenuListeners({
    getItems(el) {
      return el.parentElement!.parentElement!.querySelectorAll('.card-link')
    },
    select() {
      dispatch('enter')
    }
  })
</script>

<ul
  bind:this={node}
  class="card-links"
  role="menu"
  on:keydown={onKeyDown}
  on:keyup={onKeyUp}
>
  <slot />
</ul>

<style>
  .card-links {
    margin-block: var(--padding-l);
    list-style: none;
  }

  :global(.card) > .card-links:first-child {
    margin-top: calc(-1 * var(--padding-l));
  }

  :global(.card) > .card-links:last-child {
    margin-bottom: calc(-1 * var(--padding-l));
  }
</style>
