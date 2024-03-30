<script lang="ts">
  import type { AriaRole } from 'svelte/elements'

  export let node: HTMLUListElement | null = null
  export let id: string | undefined = undefined
  export let role: AriaRole | undefined = 'listbox'
</script>

<ul bind:this={node} {id} class="card-links" {role}>
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
