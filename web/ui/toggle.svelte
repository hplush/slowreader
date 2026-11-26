<script lang="ts">
  import type { ReadableAtom } from 'nanostores'

  import Icon from './icon.svelte'
  import Loader from './loader.svelte'

  let {
    disabled,
    icon,
    label,
    loader = false,
    size = 'inline',
    store
  }: {
    disabled?: boolean
    icon?: string
    label: string
    loader?: boolean
    size?: 'icon' | 'inline'
    store: ReadableAtom<boolean>
  } = $props()

  // Native disabled input loses the focus, so both states only ignore clicks
  let blocked = $derived(!!disabled || loader)
</script>

<label
  class="toggle is-secondary"
  class:is-icon={size === 'icon'}
  class:is-loader={loader}
  aria-disabled={blocked || null}
  title={size === 'icon' ? label : null}
>
  <input
    class="toggle_input"
    aria-busy={loader || null}
    aria-disabled={blocked || null}
    onclick={e => {
      if (blocked) e.preventDefault()
    }}
    type="checkbox"
    bind:checked={$store}
  />
  {#if loader}
    <span class="toggle_loader">
      <Loader track="toggle" />
    </span>
  {/if}
  <div class="toggle_cap" aria-hidden={loader || null}>
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

      &&:active:not([aria-disabled='true']) {
        box-shadow: var(--pressed-shadow);
      }

      html:not(.is-quiet-cursor) &:not([aria-disabled='true']) {
        cursor: pointer;
      }

      &[aria-disabled='true']:not(.is-loader) {
        opacity: 60%;
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
      position: absolute;
      width: var(--min-size);
      height: var(--min-size);
      pointer-events: none;
      opacity: 0%;
    }

    .toggle_loader {
      position: absolute;
      inset: 0 0.375rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .toggle_cap {
      box-sizing: border-box;
      display: flex;
      gap: var(--control-gap);
      align-items: center;
      justify-content: center;
      min-height: var(--control-height);
      padding: 0.4rem var(--control-padding);

      .toggle:active:not([aria-disabled='true']) & {
        translate: 0 1px;
      }

      .toggle.is-icon & {
        width: var(--control-height);
        padding: 0;
        text-align: center;
      }

      .toggle.is-loader & {
        opacity: 0%;
      }
    }

    .toggle_text {
      flex-shrink: 1;
      overflow-wrap: anywhere;
    }
  }
</style>
