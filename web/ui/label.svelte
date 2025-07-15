<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    id
  }: {
    children: Snippet
    id?: string
  } = $props()
</script>

<label class="label" for={id}>{@render children()}</label>

<style>
  :global {
    .label {
      padding-inline-start: 8px;
      padding-bottom: 3px;
      font: var(--control-secondary-font);
    }
  }
</style>
