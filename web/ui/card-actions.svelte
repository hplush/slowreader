<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<footer class="card-actions">
  {@render children()}
</footer>

<style>
  .card-actions {
    display: flex;
    gap: var(--padding-m);

    &:not(:first-child) {
      margin-top: var(--padding-l);
    }
  }
</style>
