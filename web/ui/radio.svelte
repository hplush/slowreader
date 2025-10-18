<script generics="Value extends string" lang="ts">
  import type { WritableStore } from 'nanostores'

  import Icon from './icon.svelte'
  import Label from './label.svelte'

  let {
    label,
    store,
    values
  }: {
    label: string
    store: WritableStore<Value>
    values: [Value, string, string][]
  } = $props()

  let id = $props.id()

  function change(e: { currentTarget: HTMLInputElement } & Event): void {
    let value = e.currentTarget.value as Value
    store.set(value)
  }

  let position = $derived(values.findIndex(i => i[0] === $store))
</script>

<fieldset aria-orientation="vertical" role="radiogroup">
  <Label legend>{label}</Label>
  <div class="radio_gutter">
    <div
      style:--radio-width={`${100 / values.length}%`}
      style:--radio-position={`${(100 / values.length) * position}%`}
      class="radio_slider"
    ></div>
    {#each values as [key, name, icon] (key)}
      <label class="radio_label">
        <div class="radio_cap">
          <input
            name={id}
            class="radio_input"
            checked={key === $store}
            onchange={change}
            type="radio"
            value={key}
          />
          <Icon path={icon} />
          {name}
        </div>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  :global {
    .radio_gutter {
      position: relative;
      display: grid;
      grid-auto-columns: 1fr;
      grid-auto-flow: column;
      background: --tune-background(--gutter);
      border-radius: calc(var(--base-radius) + 0.125rem);
      box-shadow: var(--gutter-shadow);
      corner-shape: squircle;
    }

    .radio_slider {
      position: absolute;
      inset-inline-start: calc(0.125rem + var(--radio-position));
      top: 0.125rem;
      bottom: 0.125rem;
      z-index: 2;
      width: calc(var(--radio-width) - 0.25rem);
      background: --tune-background(--current);
      border-radius: var(--base-radius);
      box-shadow: var(--slider-shadow);
      transition:
        left 150ms,
        width 150ms;
      corner-shape: squircle;
    }

    .radio_label {
      @mixin clickable;

      position: relative;
      z-index: 2;
      align-items: center;
      height: var(--control-height);
      border-radius: var(--base-radius);
      corner-shape: squircle;

      &:hover:not(:has(:checked)),
      &:active:not(:has(:checked)),
      &:focus-visible:not(:has(:checked)) {
        background: var(--slider-hover-background);
      }

      &:not(:has(:checked)):active {
        box-shadow: var(--pressed-shadow);
      }
    }

    .radio_cap {
      display: flex;
      gap: var(--control-gap);
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 0 var(--control-padding);
      font: var(--control-font);

      .radio_label:not(:has(:checked)):active & {
        translate: 0 1px;
      }
    }

    .radio_input {
      position: absolute;
      inset: 0;
      appearance: none;
      cursor: pointer;
      border-radius: var(--base-radius);
      corner-shape: squircle;

      .radio_label:has(:checked) & {
        cursor: default;
      }

      &:focus-visible {
        outline-offset: 0;
      }
    }
  }
</style>
