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
      height: var(--control-height);
      padding: 0 var(--control-padding);
      font: var(--control-mono-font);
      background: --tune-background(--flat-button);
      border: none;
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);
      corner-shape: squircle;

      &:focus-visible {
        outline-offset: 0;
      }
    }
  }
</style>
