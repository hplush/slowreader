<script lang="ts">
  import type { Snippet } from 'svelte'

  import { theme } from '../stores/theme.ts'

  let { children }: { children: Snippet } = $props()
</script>

<span
  class="inverse-theme"
  class:is-dark-theme={$theme === 'light'}
  class:is-light-theme={$theme === 'dark'}
>
  {@render children()}
</span>

<style>
  :global {
    .inverse-theme {
      flex-shrink: 1;
    }
  }
</style>
