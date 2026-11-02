<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    action,
    center = false,
    children
  }: { action?: Snippet; center?: boolean; children: Snippet } = $props()
</script>

<div class="title" class:is-center={center}>
  <h1 class="title_text">{@render children()}</h1>
  {@render action?.()}
</div>

<style>
  :global {
    .title {
      display: flex;
      gap: 0.625rem;
      align-items: center;
      align-self: stretch;
      justify-content: space-between;

      &.is-center {
        justify-content: center;
        text-align: center;
      }
    }

    .title_text {
      flex-shrink: 1;
      font: var(--app-title-font);
      overflow-wrap: anywhere;
    }
  }
</style>
