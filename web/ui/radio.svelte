<script generics="Value extends string" lang="ts">
  import Icon from './icon.svelte'
  import Label from './label.svelte'

  let {
    label,
    onchange,
    value,
    values,
    wide
  }: {
    label: string
    onchange: (value: Value) => void
    value: Value
    values: [Value, string, string?][]
    wide?: boolean
  } = $props()

  let id = $props.id()

  function change(e: { currentTarget: HTMLInputElement } & Event): void {
    onchange(e.currentTarget.value as Value)
  }

  let position = $derived(values.findIndex(i => i[0] === value))
</script>

<fieldset
  class="radio"
  class:is-wide={wide}
  aria-orientation="vertical"
  role="radiogroup"
>
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
            checked={key === value}
            onchange={change}
            type="radio"
            value={key}
          />
          {#if icon}
            <Icon path={icon} />
          {/if}
          {name}
        </div>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  :global {
    .radio {
      width: fit-content;

      &.is-wide {
        flex-shrink: 1;
        width: stretch;
      }
    }

    .radio_gutter {
      position: relative;
      display: grid;
      grid-auto-columns: 1fr;
      grid-auto-flow: column;
      background: --tune-background(--gutter);
      border-radius: calc(var(--base-radius) + var(--slider-padding));
      box-shadow: var(--field-shadow);
      corner-shape: squircle;
    }

    .radio_slider {
      position: absolute;
      inset-inline-start: calc(var(--slider-padding) + var(--radio-position));
      top: var(--slider-padding);
      bottom: var(--slider-padding);
      z-index: 2;
      width: calc(var(--radio-width) - 2 * var(--slider-padding));
      background: --tune-background(--current);
      border-radius: var(--base-radius);
      box-shadow: var(--button-shadow);
      transition:
        left var(--simple-time) var(--slide-easing),
        width var(--simple-time) var(--slide-easing);
      corner-shape: squircle;
    }

    .radio_label {
      @mixin clickable;

      position: relative;
      z-index: 2;
      min-height: var(--control-height);
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
      box-sizing: border-box;
      display: flex;
      gap: var(--control-gap);
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 0.4rem var(--control-padding);
      font: var(--control-font);
      overflow-wrap: anywhere;

      .radio_label:not(:has(:checked)):active & {
        translate: 0 1px;
      }
    }

    .radio_input {
      position: absolute;
      inset: 0;
      appearance: none;
      border-radius: var(--base-radius);
      corner-shape: squircle;

      .radio_label:has(:checked) & {
        cursor: default;
      }

      &:focus-visible {
        outline-offset: 0;
      }

      html:not(.is-quiet-cursor) & {
        cursor: pointer;
      }
    }
  }
</style>
