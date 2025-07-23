<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<div class="page-action">
  {@render children()}
</div>

<style>
  :global {
    .page-action {
      position: absolute;
      inset-inline-start: 0.625rem;
      top: 0.625rem;
    }
  }
</style>
