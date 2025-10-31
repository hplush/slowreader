<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    id = null,
    tag = 'label'
  }: {
    children: Snippet
    id?: null | string
    tag?: 'h2' | 'label' | 'legend'
  } = $props()
</script>

<svelte:element this={tag} class="label" for={id}>
  {@render children()}
</svelte:element>

<style>
  :global {
    .label {
      padding-inline-start: var(--control-padding);
      padding-bottom: 0.25rem;
      font: var(--control-secondary-font);
    }
  }
</style>
