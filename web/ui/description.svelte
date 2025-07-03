<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<div class="description">
  {@render children()}
</div>

<style>
  :global {
    .description {
      margin: -4px 0 16px;
    }

    .description > p {
      margin-bottom: 8px;
    }
  }
</style>
