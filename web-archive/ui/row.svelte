<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, compact = false }: { children: Snippet; compact?: boolean } =
    $props()
</script>

<div class="row" class:is-compact={compact}>
  {@render children()}
</div>

<style>
  :global {
    .row {
      display: flex;
      gap: var(--padding-l);
      align-items: center;

      &.is-compact {
        gap: var(--padding-m);
      }
    }
  }
</style>
