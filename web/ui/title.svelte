<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children, font = 'app' }: { children: Snippet; font?: 'app' | 'safe' } =
    $props()
</script>

<h1 class="title" class:is-safe={font === 'safe'}>{@render children()}</h1>

<style>
  :global {
    .title {
      font: var(--app-title-font);

      &.is-safe {
        font: var(--title-font);
      }
    }
  }
</style>
