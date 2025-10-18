<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    id,
    legend
  }: {
    children: Snippet
    id?: string
    legend?: boolean
  } = $props()
</script>

{#if legend}
  <legend class="label">{@render children()}</legend>
{:else}
  <label class="label" for={id}>{@render children()}</label>
{/if}

<style>
  :global {
    .label {
      padding-inline-start: var(--control-padding);
      padding-bottom: 0.25rem;
      font: var(--control-secondary-font);
    }
  }
</style>
