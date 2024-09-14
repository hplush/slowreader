<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<p class="paragraph">
  {@render children()}
</p>

<style>
  :global {
    .paragraph + .paragraph {
      margin-top: var(--padding-m);
    }

    .card > .paragraph:first-child {
      margin-top: var(--card-text-fix);
    }

    .card > .paragraph:last-child {
      margin-bottom: var(--card-text-fix);
    }
  }
</style>
