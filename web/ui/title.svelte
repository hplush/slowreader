<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<h1 class="title">{@render children()}</h1>

<style>
  :global {
    .title {
      font: var(--app-title-font);
    }
  }
</style>
