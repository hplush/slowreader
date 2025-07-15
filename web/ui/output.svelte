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
      margin: 10px 0;
    }

    .output_field {
      box-sizing: border-box;
      width: 100%;
      padding: 4px 6px;
      font: var(--control-mono-font);
      background: var(--field-color);
      border: none;
      border-radius: 8px;

      &:focus-visible {
        outline-offset: 1px;
      }
    }
  }
</style>
