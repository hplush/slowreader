<script generics="Value extends string" lang="ts">
  import { createEventDispatcher } from 'svelte'

  import { generateMenuListeners } from '../lib/hotkeys.js'

  export let label: string
  export let current: Value
  export let values: [Value, string][]
  export let hideLabel = false

  let [onKeyDown, onKeyUp] = generateMenuListeners({
    getItems(el) {
      return el.parentElement!.querySelectorAll('.radio_value')
    },
    selectOnFocus: true
  })
  let dispatch = createEventDispatcher<{ change: Value }>()

  function onInput(e: Event & { currentTarget: HTMLInputElement }): void {
    dispatch('change', e.currentTarget.value as Value)
  }
</script>

<fieldset
  class="radio-field"
  aria-label={hideLabel ? label : undefined}
  role="radiogroup"
>
  {#if !hideLabel}
    <legend class="radio-field_label">{label}</legend>
  {/if}
  {#each values as [value, name] (value)}
    <!-- svelte-ignore a11y-no-noninteractive-element-to-interactive-role -->
    <label
      class="radio-field_value"
      aria-checked={current === value}
      role="radio"
      tabindex={current === value ? 0 : -1}
      on:keyup={onKeyUp}
      on:keydown={onKeyDown}
    >
      <input
        class="radio-field_input"
        checked={current === value}
        tabindex="-1"
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
    margin-bottom: calc(var(--outer-radius) - var(--padding-l));
  }

  .radio-field:first-child {
    margin-top: 0;
  }

  .radio-field:last-child {
    margin-bottom: 0;
  }

  .radio-field_label {
    padding-bottom: var(--padding-l);
    font-weight: bold;

    &.is-hidden {
      display: none;
    }
  }

  .radio-field_value {
    position: relative;
    padding-block: var(--padding-l);
    padding-inline: calc(3 * var(--padding-l)) var(--padding-l);
    margin-inline: calc(-1 * var(--padding-l));
    cursor: pointer;
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

    &:focus-visible {
      outline-offset: 0;
    }
  }

  :global(.card) > .radio-field:last-child .radio-field_value:last-child {
    margin-bottom: calc(-1 * var(--padding-l));
    border-bottom: none;
    border-radius: 0 0 var(--outer-radius) var(--outer-radius);

    &:active {
      box-shadow:
        var(--card-item-pressed-shadow),
        var(--card-item-above-shadow),
        0 5px 0 var(--land-color);
    }
  }

  .radio-field_value:not(:first-of-type):focus-visible::before,
  .radio-field_value:not(:last-of-type):focus-visible::after {
    position: absolute;
    inset-inline-end: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 50px;
    height: 100%;
    font: var(--hotkey-font);
    color: var(--hotkey-color);
  }

  .radio-field_value:not(:first-of-type):focus-visible::before {
    bottom: calc(100% + 1px);
    content: '↑';
  }

  .radio-field_value:not(:last-of-type):focus-visible::after {
    top: calc(100% + 1px);
    content: '↓';
  }

  :global(.is-hotkey-disabled)
    .radio-field_value:not(:first-of-type):focus-visible::before,
  :global(.is-hotkey-disabled)
    .radio-field_value:not(:last-of-type):focus-visible::after {
    display: none;
  }

  .radio-field_input {
    display: none;
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
