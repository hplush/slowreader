<script lang="ts">
  import { mdiCheck, mdiClose } from '@mdi/js'
  import type { WritableAtom } from 'nanostores'
  import { onMount } from 'svelte'

  import Icon from './icon.svelte'

  let {
    disabled = false,
    label,
    reverseStore,
    store
  }: {
    disabled?: boolean
    label: string
    reverseStore?: WritableAtom<boolean>
    store?: WritableAtom<boolean>
  } = $props()

  let value = $state(false)

  onMount(() => {
    if (store) {
      return store.subscribe(v => {
        value = v
      })
    } else if (reverseStore) {
      return reverseStore.subscribe(v => {
        value = !v
      })
    }
  })

  function onchange(): void {
    if (store) store.set(value)
    if (reverseStore) reverseStore.set(!value)
  }
</script>

<label class="switch">
  <div class="switch_text">{label}</div>
  <input
    class="switch_input sr-only"
    {disabled}
    {onchange}
    type="checkbox"
    bind:checked={value}
  />
  <div class="switch_gutter">
    <div class="switch_slider">
      <div class="switch_icons">
        <Icon path={mdiClose} />
        <Icon path={mdiCheck} />
      </div>
    </div>
  </div>
</label>

<style>
  :global {
    :root {
      --switch-diff: -0.5rem;
    }

    .switch {
      position: relative;
      width: stretch;
      min-height: var(--control-height);
      padding-inline-end: calc(
        -1 * var(--switch-diff) / 2 + 2 *
          (var(--control-height) - var(--slider-padding) + var(--switch-diff))
      );
      margin-inline-end: calc(var(--switch-diff) / 2);
      border-radius: calc(var(--base-radius) + var(--slider-padding));

      html:not(.is-quiet-cursor) &:not(:has(:disabled)) {
        cursor: pointer;
      }

      &:hover:not(:has(:disabled)),
      &:active:not(:has(:disabled)),
      &:has(.switch_input:focus-visible) {
        background: --tune-background(--flat-button --flat-button-hover);
      }

      &:has(.switch_input:focus-visible) {
        @mixin focus;
      }
    }

    .switch_text {
      flex-shrink: 1;
      padding: 0.4rem 0.25rem 0.4rem var(--control-padding);
      font: var(--control-font);
      overflow-wrap: anywhere;
      user-select: none;
    }

    .switch_gutter {
      position: absolute;
      inset-inline-end: calc(-1 * var(--switch-diff) / 2);
      top: calc(-1 * var(--switch-diff) / 2);
      width: calc(
        2 * (var(--control-height) - var(--slider-padding) + var(--switch-diff))
      );
      height: calc(var(--control-height) + var(--switch-diff));
      background: --tune-background(--gutter --colorize, --dangerous);
      border-radius: calc(var(--base-radius) + var(--slider-padding));
      box-shadow: var(--field-shadow);

      .switch:active & {
        box-shadow: var(--pressed-shadow);
      }

      .switch_input:disabled + & {
        box-shadow: var(--flat-control-shadow);
      }

      .switch_input:checked + & {
        background: --tune-background(--gutter --colorize, --good);
      }
    }

    .switch:not(:has(:disabled)):hover .switch_gutter::before {
      position: absolute;
      inset: 0;
      content: '';
      background: var(--slider-hover-background);
      border-radius: var(--base-radius);
    }

    .switch_slider {
      position: absolute;
      inset-inline-start: 0.125rem;
      top: 0.125rem;
      width: calc(
        var(--control-height) - 2 * var(--slider-padding) + var(--switch-diff)
      );
      height: calc(
        var(--control-height) - 2 * var(--slider-padding) + var(--switch-diff)
      );
      overflow: hidden;
      background: --tune-background(--current);
      border-radius: var(--base-radius);
      box-shadow: var(--button-shadow);
      translate: 0 0;
      transition: translate var(--simple-time) var(--click-easing);

      .switch_input:disabled + .switch_gutter & {
        box-shadow: var(--flat-control-shadow);
      }

      .switch_input:checked + .switch_gutter & {
        translate: 100% 0;
      }
    }

    .switch_icons {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-around;
      width: 200%;
      height: 100%;
      translate: 0 0;
      transition: translate var(--simple-time) var(--click-easing);

      .switch_input:checked + .switch_gutter & {
        translate: -50% 0;
      }
    }
  }
</style>
