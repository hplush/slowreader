<script generics="Value extends string" lang="ts">
  import { nanoid } from 'nanoid/non-secure'
  import { createEventDispatcher } from 'svelte'

  export let label: string
  export let current: Value
  export let values: [Value, string][]

  let id = nanoid()

  let dispatch = createEventDispatcher<{ change: Value }>()

  function onInput(e: { currentTarget: HTMLInputElement } & Event): void {
    dispatch('change', e.currentTarget.value as Value)
  }
</script>

<fieldset class="radio-field" aria-label={label} role="radiogroup">
  {#each values as [value, name] (value)}
    <label class="radio-field_value">
      <input
        name={id}
        class="radio-field_input"
        checked={current === value}
        type="radio"
        {value}
        on:input={onInput}
      />
      <div class="radio-field_fake"></div>
      {name}
    </label>
  {/each}
</fieldset>

<style>
  .radio-field {
    margin-top: var(--padding-l);
    margin-bottom: calc(var(--padding-l) - var(--radius));
  }

  .radio-field:first-child {
    margin-top: 0;
  }

  .radio-field:last-child {
    margin-bottom: 0;
  }

  .radio-field_value {
    position: relative;
    padding-block: var(--padding-l);
    padding-inline: calc(3 * var(--padding-l)) var(--padding-l);
    margin-inline: calc(-1 * var(--padding-l));
    cursor: pointer;
    user-select: none;
    border-top: 1px solid var(--border-color);

    &:last-of-type {
      border-bottom: 1px solid var(--border-color);
    }

    &:hover {
      background: var(--hover-color);
    }

    &:active {
      padding-block: calc(var(--padding-l) + 2px) calc(var(--padding-l) - 1px);
      border-top: none;
      box-shadow: var(--card-item-pressed-shadow), var(--card-item-above-shadow);
    }

    &:has(input:focus-visible) {
      z-index: 10;
      outline: 3px solid var(--focus-color);
      outline-offset: 0;
    }
  }

  :global(.card) > .radio-field:first-child .radio-field_value:first-child {
    margin-top: calc(-1 * var(--padding-l));
    border-top: none;
    border-radius: var(--radius) var(--radius) 0 0;

    &:active {
      padding-block: var(--padding-l) calc(var(--padding-l) - 1px);
      margin-top: calc(-1 * var(--padding-l) + 1px);
      box-shadow:
        var(--card-item-pressed-shadow),
        0 -5px 0 var(--land-color);
    }
  }

  :global(.card) > .radio-field:last-child .radio-field_value:last-child {
    margin-bottom: calc(-1 * var(--padding-l));
    border-bottom: none;
    border-radius: 0 0 var(--radius) var(--radius);

    &:active {
      box-shadow:
        var(--card-item-pressed-shadow),
        var(--card-item-above-shadow),
        0 5px 0 var(--land-color);
    }
  }

  .radio-field_input {
    position: absolute;
    width: 0;
    height: 0;
    appearance: none;
    opacity: 0%;
  }

  .radio-field_fake {
    position: absolute;
    inset-inline-start: var(--padding-l);
    box-sizing: border-box;
    display: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--padding-l);
    height: var(--padding-l);
    margin-top: 5px;
    vertical-align: middle;
    border: 2px solid var(--border-color);
    border-radius: 50%;
    transition: border 200ms;
  }

  input:checked + .radio-field_fake {
    border-color: var(--text-color);
  }

  .radio-field_fake::after {
    display: block;
    width: 0;
    height: 0;
    content: '';
    background: var(--text-color);
    border-radius: 50%;
    transition:
      height 200ms cubic-bezier(0.34, 1.56, 0.64, 1),
      width 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  input:checked + .radio-field_fake::after {
    width: var(--padding-m);
    height: var(--padding-m);
  }
</style>
