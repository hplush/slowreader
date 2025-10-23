<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, id }: { children: Snippet; id?: string } = $props()
</script>

<div {id} class="error" aria-live="polite">
  {@render children()}
</div>

<style>
  :global {
    .error {
      padding: 0 0.5rem;
      font: var(--control-font);
      color: var(--dangerous-text-color);
    }
  }
</style>
