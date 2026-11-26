<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    align = 'start',
    children,
    id
  }: { align?: 'end' | 'start'; children: Snippet; id?: string } = $props()
</script>

<div {id} class="error" class:is-align-end={align === 'end'} aria-live="polite">
  {@render children()}
</div>

<style>
  :global {
    .error {
      padding: 0 0.5rem;
      font: var(--control-font);
      color: var(--dangerous-text-color);

      &.is-align-end {
        width: stretch;
        text-align: end;
      }
    }
  }
</style>
