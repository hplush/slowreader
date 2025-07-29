<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements'

  import Label from './label.svelte'

  let {
    label,
    value = $bindable(''),
    ...props
  }: {
    label: string
  } & HTMLInputAttributes = $props()

  // TODO onclick select all

  let id = $props.id()
</script>

<div class="output">
  <Label {id}>{label}</Label>
  <input
    {id}
    class="output_field"
    onfocus={e => {
      e.currentTarget.select()
    }}
    readonly
    {value}
    {...props}
  />
</div>

<style>
  :global {
    .output {
      width: stretch;
    }

    .output_field {
      box-sizing: border-box;
      width: stretch;
      padding: 0.25rem 0.5rem;
      font: var(--control-mono-font);
      background: --tune-background(--field);
      border: none;
      border-radius: 0.5rem;

      &:focus-visible {
        outline-offset: 1px;
      }
    }
  }
</style>
