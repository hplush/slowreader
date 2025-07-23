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
      margin: 0.625rem 0;
    }

    .output_field {
      box-sizing: border-box;
      width: 100%;
      padding: 0.25rem 0.5rem;
      font: var(--control-mono-font);
      background: oklch(
        from var(--current-background) calc(l + var(--field-l))
          calc(c + var(--field-c)) h
      );
      border: none;
      border-radius: 0.5rem;

      &:focus-visible {
        outline-offset: 1px;
      }
    }
  }
</style>
