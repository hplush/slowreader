<script lang="ts">
  import type { Snippet } from 'svelte'

  import PageIcon from './page-icon.svelte'

  let { children, icon }: { children: Snippet; icon: string } = $props()
</script>

<div class="placeholder">
  <PageIcon path={icon} />
  <div class="placeholder_text">
    {@render children()}
  </div>
</div>

<style>
  :global {
    .placeholder {
      --icon-size: 10rem;

      display: flex;
      flex-direction: column;
      gap: 1rem;
      align-items: center;
      margin: 1rem auto;
      color: --tune-background(--placeholder);
    }

    .placeholder_text {
      width: 18rem;
      color: var(--secondary-text-color);
    }
  }
</style>
