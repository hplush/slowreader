<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, id }: { children: Snippet; id?: string } = $props()

  let node: HTMLUListElement | null = null
</script>

<ul bind:this={node} {id} class="card-links" role="menu">
  {@render children()}
</ul>

<style>
  :global {
    .card-links {
      margin-block: var(--padding-l);
      list-style: none;
    }

    .card > .card-links:first-child {
      margin-top: calc(-1 * var(--padding-l));
    }

    .card > .card-links:last-child {
      margin-bottom: calc(-1 * var(--padding-l));
    }
  }
</style>
