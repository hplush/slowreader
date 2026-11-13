<script lang="ts">
  import { mdiCheck, mdiClose } from '@mdi/js'
  import type { WritableAtom } from 'nanostores'
  import { onDestroy, untrack } from 'svelte'

  import Icon from './icon.svelte'

  let {
    disabled = false,
    icon,
    label,
    note,
    reverseStore,
    store,
    variant = 'control'
  }: {
    disabled?: boolean
    label: string
    note?: string
    reverseStore?: WritableAtom<boolean>
    store?: WritableAtom<boolean>
  } & (
    | { icon?: string; variant?: 'control' }
    | { icon?: undefined; variant: 'title' }
  ) = $props()

  let id = $props.id()

  let value = $state(false)

  /**
   * Subscription before the first render, so the slider will not slide
   * from the default value to the store’s one on the page open.
   */
  let unbind = untrack(() => {
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

  onDestroy(() => {
    unbind?.()
  })

  function onchange(): void {
    if (store) store.set(value)
    if (reverseStore) reverseStore.set(!value)
  }
</script>

{#snippet control()}
  <label class="switch" class:is-title={variant === 'title'}>
    <div class="switch_description" class:is-iconed={!!icon}>
      {#if icon}
        <Icon compensate={3} path={icon} />
      {/if}
      <div class="switch_text">
        {label}
        {#if note && variant === 'control'}
          <div class="switch_note">{note}</div>
        {/if}
      </div>
    </div>
    <input
      class="switch_input sr-only"
      aria-describedby={note && variant === 'title' ? `${id}-note` : undefined}
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
{/snippet}

{#if variant === 'title'}
  <div class="switch_title">
    <h1 class="switch_heading">{@render control()}</h1>
    {#if note}
      <div id="{id}-note" class="switch_title-note">{note}</div>
    {/if}
  </div>
{:else}
  {@render control()}
{/if}

<style lang="postcss">
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

      &.is-title {
        margin-block-start: calc(
          var(--switch-diff) / 2 - var(--slider-padding)
        );
        margin-inline: calc(var(--switch-diff) / 2 - var(--slider-padding));
        font: var(--app-title-font);
      }
    }

    .switch_title {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      align-self: stretch;
    }

    .switch_heading {
      display: flex;
    }

    .switch_title-note {
      font: var(--text-font);
    }

    .switch_description {
      display: flex;
      gap: var(--control-gap);
      align-items: baseline;
      padding: 0.4rem 0.25rem 0.4rem var(--control-padding);

      .switch.is-title & {
        padding-block: max(0rem, (var(--control-height) - 1lh) / 2);
        padding-inline-start: calc(
          var(--slider-padding) - var(--switch-diff) / 2
        );
      }

      &.is-iconed {
        padding-inline-start: calc(
          var(--control-padding) + var(--switch-diff) / 2
        );
      }
    }

    .switch_text {
      flex-shrink: 1;
      font: var(--control-font);
      overflow-wrap: anywhere;
      user-select: none;

      .switch.is-title & {
        font: inherit;
      }
    }

    .switch_note {
      margin-top: 0.1875rem;
      font: var(--secondary-font);
      color: var(--secondary-text-color);
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
      box-shadow: var(--hard-button-shadow);
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
