<script lang="ts">
  import type { Snippet } from 'svelte'

  import { pageTheme } from '../stores/page-theme.ts'

  let { children }: { children: Snippet } = $props()
</script>

<span
  class="inverse-theme"
  class:is-dark-theme={$pageTheme === 'light'}
  class:is-light-theme={$pageTheme === 'dark'}
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
