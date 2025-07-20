<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    center,
    children,
    column = false
  }: { center?: boolean; children: Snippet; column?: boolean } = $props()
</script>

<div class="stack" class:is-center={center} class:is-column={column}>
  {@render children()}
</div>

<style>
  :global {
    .stack {
      display: flex;
      gap: 10px;

      &.is-center {
        align-items: center;
      }

      &.is-column {
        flex-direction: column;
      }
    }
  }
</style>
