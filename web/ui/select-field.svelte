<script generics="Value extends string" lang="ts">
  import { mdiChevronDown } from '@mdi/js'
  import { nanoid } from 'nanoid/non-secure'
  import { createEventDispatcher } from 'svelte'

  import Icon from './icon.svelte'

  export let label: string
  export let values: [Value, string][]
  export let current: Value
  export let hideLabel = false

  let id = nanoid()
  let dispatch = createEventDispatcher<{ change: Value }>()

  function onChange(e: Event & { currentTarget: HTMLSelectElement }): void {
    dispatch('change', e.currentTarget.value as Value)
  }

  let currentName: string
  $: {
    let currentOption = values.find(i => i[0] === current)
    currentName = currentOption ? currentOption[1] : ' '
  }
</script>

<label class="select-field">
  {#if !hideLabel}
    <label for={id}>{label}</label>
  {/if}
  <div class="select-field_fake">
    <div class="select-field_text">{currentName}</div>
    <Icon path={mdiChevronDown} />
    <select
      {id}
      class="select-field_select"
      aria-label={hideLabel ? label : null}
      on:change={onChange}
    >
      {#each values as [value, name] (value)}
        <option selected={current === value} {value}>{name}</option>
      {/each}
    </select>
  </div>
</label>

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

  .select-field_text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-field_select {
    position: absolute;
    inset: -1px;
    width: calc(100% + 2px);
    opacity: 0%;
  }
</style>
