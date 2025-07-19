<script lang="ts">
  import type { Snippet } from 'svelte'

  import { theme } from '../stores/theme.ts'

  let { children }: { children: Snippet } = $props()
</script>

<span
  class="inserse-theme"
  class:is-dark-theme={$theme === 'light'}
  class:is-light-theme={$theme === 'dark'}
>
  {@render children()}
</span>

<style>
  :global {
    .inserse-theme {
      flex-shrink: 1;
    }
  }
</style>
