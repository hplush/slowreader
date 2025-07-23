<script lang="ts">
  let {
    field = false,
    id,
    text
  }: { field?: boolean; id?: string; text?: string } = $props()
</script>

{#if text}
  <div {id} class="error" class:is-field={field} aria-live="polite">
    {text}
  </div>
{/if}

<style>
  :global {
    .error {
      padding: 0 0.5rem;
      margin: 0.625rem 0;
      font: var(--control-font);
      color: var(--dangerous-text-color);

      &.is-field {
        margin-top: 0.125rem;
        font: var(--control-secondary-font);
      }
    }
  }
</style>
