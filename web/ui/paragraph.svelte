<script lang="ts">
  import type { Snippet } from 'svelte'

  let { children }: { children: Snippet } = $props()
</script>

<p class="paragraph">
  {@render children()}
</p>

<style>
  .paragraph + .paragraph {
    margin-top: var(--padding-m);
  }

  :global(.card) > .paragraph:first-child {
    margin-top: var(--card-text-fix);
  }

  :global(.card) > .paragraph:last-child {
    margin-bottom: var(--card-text-fix);
  }
</style>
