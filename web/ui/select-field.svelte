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
    height: var(--control-height);
    padding-inline: var(--padding-l) var(--padding-m);
    overflow: hidden;
    font-weight: 600;
    background: var(--secondary-button-color);
    border-radius: var(--inner-radius);

    &:has(:hover),
    &:has(.is-pseudo-hover),
    &:has(:focus-visible),
    &:has(.is-pseudo-focus-visible),
    &:has(:active),
    &:has(.is-pseudo-active) {
      background: var(--secondary-button-hover-color);
    }

    &:has(:focus-visible),
    &:has(.is-pseudo-focus-visible) {
      outline: 3px solid var(--focus-color);
      outline-offset: 3px;
    }

    &:has(:active),
    &:has(.is-pseudo-active) {
      padding-top: 1px;
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
    inset: 0;
    width: 100%;
    opacity: 0%;
  }
</style>
