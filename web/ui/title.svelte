<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<h1 class="title">{@render children()}</h1>

<style>
  :global {
    .title {
      /* TODO: Replace to text-box-trim when FF will support it */
      margin-top: -2px;
      margin-bottom: 12px;
      font: var(--app-title-font);
    }
  }
</style>
