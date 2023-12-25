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
  class="radio"
  aria-label={hideLabel ? label : undefined}
  role="radiogroup"
>
  {#if !hideLabel}
    <legend class="radio_label">{label}</legend>
  {/if}
  {#each values as [value, name] (value)}
    <!-- svelte-ignore a11y-no-noninteractive-element-to-interactive-role -->
    <label
      class="radio_value"
      aria-checked={current === value}
      role="radio"
      tabindex={current === value ? 0 : -1}
      on:keyup={onKeyUp}
      on:keydown={onKeyDown}
    >
      <input
        class="radio_input"
        checked={current === value}
        tabindex="-1"
        type="radio"
        {value}
        on:input={onInput}
      />
      <div class="radio_fake"></div>
      {name}
    </label>
  {/each}
</fieldset>

<style>
  .radio {
    margin-top: var(--padding-l);
    margin-bottom: calc(var(--outer-radius) - var(--padding-l));
  }

  .radio:first-child {
    margin-top: 0;
  }

  .radio:last-child {
    margin-bottom: 0;
  }

  .radio_label {
    padding-bottom: var(--padding-l);
    font-weight: bold;

    &.is-hidden {
      display: none;
    }
  }

  .radio_value {
    position: relative;
    padding-block: var(--padding-l);
    padding-inline: calc(3 * var(--padding-l)) var(--padding-l);
    margin-inline: calc(-1 * var(--padding-l));
    cursor: pointer;
    border-top: 1px solid var(--zone-color);

    &:last-of-type {
      border-bottom: 1px solid var(--zone-color);
    }

    &:hover {
      background: var(--hover-color);
    }

    &:active {
      padding-block: calc(var(--padding-l) + 2px) calc(var(--padding-l) - 1px);
      border-top: none;
      box-shadow: var(--card-item-pressed-shadow);
    }

    &:focus-visible {
      outline-offset: 0;
    }
  }

  :global(.card) > .radio:last-child .radio_value:last-child {
    margin-bottom: calc(-1 * var(--padding-l));
    border-bottom: none;
    border-radius: 0 0 var(--outer-radius) var(--outer-radius);

    &:active {
      box-shadow:
        var(--card-item-pressed-shadow),
        0 5px 0 var(--land-color);
    }
  }

  .radio_value:not(:first-of-type):focus-visible::before,
  .radio_value:not(:last-of-type):focus-visible::after {
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

  .radio_value:not(:first-of-type):focus-visible::before {
    bottom: calc(100% + 1px);
    content: '↑';
  }

  .radio_value:not(:last-of-type):focus-visible::after {
    top: calc(100% + 1px);
    content: '↓';
  }

  :global(.is-hotkey-disabled)
    .radio_value:not(:first-of-type):focus-visible::before,
  :global(.is-hotkey-disabled)
    .radio_value:not(:last-of-type):focus-visible::after {
    display: none;
  }

  .radio_input {
    display: none;
  }

  .radio_fake {
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
    border: 2px solid var(--zone-color);
    border-radius: 50%;
    transition: border 200ms;
  }

  input:checked + .radio_fake {
    border-color: var(--text-color);
  }

  .radio_fake::after {
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

  input:checked + .radio_fake::after {
    width: var(--padding-m);
    height: var(--padding-m);
  }
</style>
