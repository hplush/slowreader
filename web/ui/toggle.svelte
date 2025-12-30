<script lang="ts">
  import type { ReadableAtom } from 'nanostores'

  import Icon from './icon.svelte'

  let {
    icon,
    label,
    size = 'inline',
    store
  }: {
    icon?: string
    label: string
    size?: 'icon' | 'inline'
    store: ReadableAtom<boolean>
  } = $props()
</script>

<label
  class="toggle is-secondary"
  class:is-icon={size === 'icon'}
  title={size === 'icon' ? label : null}
>
  <input class="toggle_input" type="checkbox" bind:checked={$store} />
  <div class="toggle_cap">
    {#if icon}
      <Icon path={icon} />
    {/if}
    <span class="toggle_text" class:sr-only={size === 'icon'}>
      {label}
    </span>
  </div>
</label>

<style lang="postcss">
  :global {
    .toggle {
      @mixin clickable;

      --toggle-background: var(--current-background);

      position: relative;
      display: inline-block;
      width: fit-content;
      font: var(--control-font);
      background: var(--toggle-background);
      border-radius: var(--base-radius);

      &:has(.toggle_input:checked) {
        box-shadow: var(--field-shadow);

        --toggle-background: --tune-background(--current);
      }

      &:has(.toggle_input:focus-visible) {
        @mixin focus;
      }

      &&:active {
        box-shadow: var(--pressed-shadow);
      }

      html:not(.is-quiet-cursor) &:not(:has(:disabled)) {
        cursor: pointer;
      }

      &.is-secondary {
        color: var(--text-color);

        --toggle-background: --tune-background(--flat-button);

        box-shadow: var(--flat-control-shadow);

        &:hover:not([aria-disabled='true']),
        &:active:not([aria-disabled='true']),
        &:focus-visible {
          background: --tune-color(--toggle-background, --flat-button-hover);
        }
      }
    }

    .toggle_input {
      display: none;
    }

    .toggle_cap {
      box-sizing: border-box;
      display: flex;
      gap: var(--control-gap);
      align-items: center;
      justify-content: center;
      min-height: var(--control-height);
      padding: 0.4rem var(--control-padding);

      .toggle:active & {
        translate: 0 1px;
      }

      .toggle.is-icon & {
        width: var(--control-height);
        padding: 0;
        text-align: center;
      }
    }

    .toggle_text {
      flex-shrink: 1;
      overflow-wrap: anywhere;
    }
  }
</style>
