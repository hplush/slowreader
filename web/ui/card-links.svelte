<script lang="ts">
  export let node: HTMLUListElement | null = null
  export let id: string | undefined = undefined
</script>

<ul bind:this={node} {id} class="card-links" role="menu">
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
