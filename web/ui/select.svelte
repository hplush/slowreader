<script generics="Value extends string" lang="ts">
  import { mdiChevronDown } from '@mdi/js'

  import Icon from './icon.svelte'
  import Label from './label.svelte'

  let {
    label,
    onchange,
    value,
    values
  }: {
    label: string
    onchange: (value: Value) => void
    value: Value
    values: [Value, string][]
  } = $props()

  let id = $props.id()

  let current = $derived.by(() => {
    let currentOption = values.find(i => i[0] === value)
    return currentOption ? currentOption[1] : ' '
  })
</script>

<div class="select">
  <Label {id}>{label}</Label>
  <div class="select_fake">
    <div class="select_overflow">
      <div class="select_text">{current}</div>
    </div>
    <Icon path={mdiChevronDown} />
    <select
      {id}
      class="select_select"
      onchange={e => {
        onchange(e.currentTarget.value as Value)
      }}
    >
      {#each values as [key, name] (key)}
        <option selected={value === key} value={key}>{name}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  :global {
    .select {
      flex-shrink: 1;
      width: stretch;
    }

    .select_fake {
      position: relative;
      box-sizing: border-box;
      display: flex;
      flex-shrink: 1;
      gap: 0.25rem;
      align-items: center;
      justify-content: space-between;
      height: var(--control-height);
      padding: 0 var(--control-padding);
      overflow: hidden;
      font: var(--control-font);
      background: --tune-background(--field);
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);
      corner-shape: squircle;

      &:has(.select_select:focus-visible) {
        @mixin focus;
      }

      &:has(.select_select:open) {
        padding-top: var(--min-size);
        box-shadow: var(--pressed-shadow);
      }
    }

    .select_overflow {
      flex-shrink: 1;
      overflow: hidden;
    }

    .select_text {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .select_select {
      position: absolute;
      inset: 0;
      font: revert;
      appearance: none;
      opacity: 0%;
    }
  }
</style>
