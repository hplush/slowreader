<script lang="ts">
  import type { Snippet } from 'svelte'

  let { center = false, children }: { center?: boolean; children: Snippet } =
    $props()
</script>

<h1 class="title" class:is-center={center}>{@render children()}</h1>

<style>
  :global {
    .title {
      font: var(--app-title-font);

      &.is-center {
        text-align: center;
      }
    }
  }
</style>
