<script generics="Value extends string" lang="ts">
  import { mdiChevronDown } from '@mdi/js'
  import { nanoid } from 'nanoid/non-secure'

  import Icon from './icon.svelte'

  let {
    current,
    hideLabel = false,
    label,
    onchange,
    values
  }: {
    current: Value
    hideLabel?: boolean
    label: string
    onchange?: (value: Value) => void
    values: [Value, string][]
  } = $props()

  let id = nanoid()

  function onChange(e: { currentTarget: HTMLSelectElement } & Event): void {
    if (onchange) onchange(e.currentTarget.value as Value)
  }

  let currentName = $derived.by(() => {
    let currentOption = values.find(i => i[0] === current)
    return currentOption ? currentOption[1] : ' '
  })
</script>

<div class="select-field">
  {#if !hideLabel}
    <label for={id}>{label}</label>
  {/if}
  <div class="select-field_fake">
    <div class="select-field_overflow">
      <div class="select-field_text">{currentName}</div>
    </div>
    <Icon path={mdiChevronDown} />
    <select
      {id}
      class="select-field_select"
      aria-label={hideLabel ? label : null}
      onchange={onChange}
    >
      {#each values as [value, name] (value)}
        <option selected={current === value} {value}>{name}</option>
      {/each}
    </select>
  </div>
</div>

<style>
  .select-field {
    display: flex;
    gap: var(--padding-m);
    align-items: center;
    justify-content: space-between;
    margin-top: var(--padding-l);

    &:first-child {
      margin-top: 0;
    }
  }

  .select-field_fake {
    position: relative;
    box-sizing: border-box;
    display: flex;
    gap: var(--padding-m);
    flex-shrink: 1;
    align-items: center;
    padding: var(--padding-m) var(--padding-m) var(--padding-m) var(--padding-l);
    overflow: hidden;
    font: var(--control-font);
    background: var(--card-color);
    border: 1px solid var(--border-color);
    border-radius: var(--radius);

    &:has(.select-field_select:hover),
    &:has(.select-field_select:focus-visible),
    &:has(.select-field_select:active) {
      background: var(--hover-color);
    }

    &:has(.select-field_select:focus-visible) {
      outline: 3px solid var(--focus-color);
      outline-offset: 3px;
    }

    &:has(.select-field_select:active) {
      padding-top: calc(var(--padding-m) + 1px);
      padding-bottom: calc(var(--padding-m) - 1px);
      box-shadow: var(--flat-active-shadow);
    }
  }

  .select-field_overflow {
    flex-shrink: 1;
    overflow: hidden;
  }

  .select-field_text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-field_select {
    position: absolute;
    inset: -1px;
    width: calc(100% + 2px);
    font: revert;
    appearance: none;
    opacity: 0%;
  }
</style>
