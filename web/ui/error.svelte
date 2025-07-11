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
      padding: 0 8px;
      margin: 10px 0;
      font: var(--control-font);
      color: var(--dangerous-text-color);

      &.is-field {
        margin-top: 2px;
        font: var(--control-secondary-font);
      }
    }
  }
</style>
