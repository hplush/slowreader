<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    vertical = false
  }: { children: Snippet; vertical?: boolean } = $props()
</script>

<div class="actions" class:is-vertical={vertical}>
  {@render children()}
</div>

<style>
  :global {
    .actions {
      display: flex;
      gap: 10px;
      align-items: center;

      &.is-vertical {
        flex-direction: column;
      }
    }
  }
</style>
