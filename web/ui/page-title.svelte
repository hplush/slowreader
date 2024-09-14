<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<h1 class="page-title">
  {@render children()}
</h1>

<style>
  :global {
    .page-title {
      margin-bottom: var(--padding-xl);
      font: var(--page-title-font);
    }
  }
</style>
