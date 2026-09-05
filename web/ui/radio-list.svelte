<script generics="Value extends string" lang="ts">
  import { mdiCancel } from '@mdi/js'

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
    values: {
      description: string
      disabled?: boolean
      name: string
      value: Value
    }[]
  } = $props()

  let id = $props.id()
</script>

<fieldset class="radio-list">
  <Label tag="legend">{label}</Label>
  <ul class="radio-list_options">
    {#each values as option (option.value)}
      <li>
        <label class="radio-list_option">
          <input
            name={id}
            class="radio-list_input"
            checked={option.value === value}
            disabled={option.disabled}
            onchange={() => {
              onchange(option.value)
            }}
            type="radio"
            value={option.value}
          />
          <span class="radio-list_mark">
            {#if option.disabled}
              <Icon path={mdiCancel} />
            {/if}
          </span>
          <span class="radio-list_text">
            <span class="radio-list_name">{option.name}</span>
            <span class="radio-list_description">{option.description}</span>
          </span>
        </label>
      </li>
    {/each}
  </ul>
</fieldset>

<style lang="postcss">
  :global {
    .radio-list {
      width: stretch;
    }

    .radio-list_options {
      list-style: none;
    }

    .radio-list_option {
      @mixin clickable;

      position: relative;
      display: flex;
      gap: var(--control-padding);
      padding: 0.625rem var(--control-padding);
      margin-top: calc(-1 * var(--min-size));
      background: --tune-background(--flat-button);
      border: calc(var(--min-size) / 2) solid var(--flat-border-color);

      li:not(:last-child) > & {
        border-bottom: none;
      }

      li:first-child & {
        margin-top: 0;
        border-radius: var(--base-radius) var(--base-radius) 0 0;
      }

      li:last-child & {
        border-radius: 0 0 var(--base-radius) var(--base-radius);
      }

      li:last-child:first-child & {
        border-radius: var(--base-radius);
      }

      &:hover,
      &:active,
      &:has(:focus-visible) {
        background: --tune-background(--flat-button --flat-button-hover);
      }

      &:has(:focus-visible) {
        @mixin focus;
      }

      &:not(:has(:checked, :disabled)):active {
        z-index: 1;
        padding-block: calc(0.625rem + var(--min-size))
          calc(0.625rem - var(--min-size));
        border-color: transparent;
        box-shadow: var(--pressed-shadow);
      }

      &:has(:checked) {
        z-index: 1;
        background: --tune-background(--current);
        border-color: transparent;
        box-shadow: var(--current-shadow);
      }

      &:has(:disabled) {
        color: var(--secondary-text-color);
        background: var(--current-background);
      }

      html:not(.is-quiet-cursor) &:not(:has(:checked, :disabled)) {
        cursor: pointer;
      }
    }

    .radio-list_input {
      position: absolute;
      inset: 0;
      appearance: none;
      background: transparent;
      border-radius: inherit;

      html:not(.is-quiet-cursor)
        .radio-list_option:not(:has(:checked, :disabled))
        & {
        cursor: pointer;
      }
    }

    .radio-list_mark {
      box-sizing: border-box;
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      margin-top: 0.1875rem;
      background: --tune-background(--placeholder);
      border-radius: 50%;

      --icon-size: 1.2rem;

      .radio-list_option:has(:disabled) & {
        color: --tune-background(--placeholder);
        background: none;
      }

      .radio-list_option:has(:checked) & {
        background: var(--text-on-accent-color);
        border: 0.3125rem solid var(--accent-color);
      }

      .radio-list_option:not(:has(:checked, :disabled)):active & {
        translate: 0 1px;
      }
    }

    .radio-list_text {
      flex-shrink: 1;
      min-width: 0;
    }

    .radio-list_name {
      display: block;
      font: var(--control-font);
      overflow-wrap: anywhere;
    }

    .radio-list_description {
      display: block;
      font: var(--secondary-font);
      overflow-wrap: anywhere;
      margin-top: 0.1875rem;
    }
  }
</style>
