<script lang="ts">
  import {
    mdiDotsVertical,
    mdiFormatFontSizeDecrease,
    mdiFormatFontSizeIncrease
  } from '@mdi/js'
  import { on } from 'svelte/events'

  import Button from './button.svelte'
  import Icon from './icon.svelte'
  import Label from './label.svelte'

  let {
    buttons,
    label,
    mark,
    max,
    min,
    oninput,
    output,
    step = 1,
    value
  }: {
    buttons?: { decrease: string; increase: string }
    label: string
    mark?: number
    max: number
    min: number
    oninput: (value: number) => void
    output: string
    step?: number
    value: number
  } = $props()

  let id = $props.id()

  let thumb: HTMLDivElement
  let hover = $state<{ dot: number; on: 'gutter' } | { on: 'none' | 'thumb' }>({
    on: 'none'
  })
  let dragging = $state<'gutter' | 'none' | 'thumb'>('none')

  function isInThumbColumn(e: PointerEvent): boolean {
    let rect = thumb.getBoundingClientRect()
    return e.clientX >= rect.left && e.clientX <= rect.right
  }

  function getClosestDot(e: { currentTarget: Element } & PointerEvent): number {
    let area = e.currentTarget.getBoundingClientRect()
    let size = thumb.getBoundingClientRect().width
    let steps = Math.round((max - min) / step)
    let progress = (e.clientX - area.left - size / 2) / (area.width - size)
    return Math.min(steps, Math.max(0, Math.round(progress * steps)))
  }
</script>

<div class="slider">
  <div class="slider_header">
    <Label {id}>{label}</Label>
    <output class="slider_output" aria-hidden="true" for={id}>{output}</output>
  </div>
  <div class="slider_control">
    {#if buttons}
      <Button
        disabled={value <= min}
        icon={mdiFormatFontSizeDecrease}
        onclick={() => {
          oninput(Math.max(min, value - step))
        }}
        size="icon"
        variant="plain"
      >
        {buttons.decrease}
      </Button>
    {/if}
    <div
      style:--slider-progress={(value - min) / (max - min)}
      class="slider_area"
      class:is-dragging={dragging !== 'none'}
      class:is-grabbed={dragging === 'thumb'}
      class:is-thumb-hover={hover.on === 'thumb'}
    >
      <div class="slider_track">
        <div class="slider_fill"></div>
      </div>
      <div class="slider_dots">
        {#each { length: Math.round((max - min) / step) + 1 }, index (index)}
          <span
            class="slider_dot"
            class:is-hover={hover.on === 'gutter' && hover.dot === index}
          ></span>
        {/each}
      </div>
      {#if mark !== undefined}
        <div
          style:--slider-mark={(mark - min) / (max - min)}
          class="slider_mark"
        ></div>
      {/if}
      <input
        {id}
        class="slider_input"
        {max}
        {min}
        oninput={e => {
          oninput(Number(e.currentTarget.value))
        }}
        onpointerdown={e => {
          dragging = isInThumbColumn(e) ? 'thumb' : 'gutter'
          hover = { on: 'thumb' }
          on(
            window,
            'pointerup',
            () => {
              dragging = 'none'
            },
            { once: true }
          )
        }}
        onpointerleave={() => {
          if (dragging === 'none') hover = { on: 'none' }
        }}
        onpointermove={e => {
          if (dragging === 'none') {
            hover = isInThumbColumn(e)
              ? { on: 'thumb' }
              : { dot: getClosestDot(e), on: 'gutter' }
          }
        }}
        {step}
        type="range"
        {value}
      />
      <div bind:this={thumb} class="slider_thumb">
        <Icon path={mdiDotsVertical} />
      </div>
    </div>
    {#if buttons}
      <Button
        disabled={value >= max}
        icon={mdiFormatFontSizeIncrease}
        onclick={() => {
          oninput(Math.min(max, value + step))
        }}
        size="icon"
        variant="plain"
      >
        {buttons.increase}
      </Button>
    {/if}
  </div>
</div>

<style lang="postcss">
  :global {
    .slider {
      --slider-thumb-height: calc(
        var(--control-height) - 2 * var(--slider-padding)
      );
      --slider-thumb-width: calc(var(--slider-thumb-height) / 1.25);
      --slider-line: 0.25rem;
      --slider-dot: 0.125rem;

      width: stretch;
    }

    .slider_header {
      display: flex;
      justify-content: space-between;
    }

    .slider_output {
      padding-inline-end: var(--control-padding);
      font: var(--control-secondary-font);
      color: var(--secondary-text-color);
    }

    .slider_control {
      display: flex;
      align-items: center;
    }

    .slider_area {
      position: relative;
      flex-grow: 1;
      flex-shrink: 1;
      height: var(--control-height);
    }

    .slider_track {
      position: absolute;
      inset-inline: calc(
        var(--slider-thumb-width) / 2 - var(--slider-line) / 2
      );
      top: calc(50% - var(--slider-line) / 2);
      height: var(--slider-line);
      background: var(--border-color);
      border-radius: var(--slider-line);
    }

    .slider_fill {
      width: calc(
        var(--slider-line) / 2 + var(--slider-progress) *
          (100% - var(--slider-line))
      );
      height: 100%;
      background: var(--accent-color);
      border-radius: var(--slider-line);
    }

    .slider_dots {
      position: absolute;
      inset-block: 0;
      inset-inline: calc(var(--slider-thumb-width) / 2 - var(--slider-dot) / 2);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .slider_dot {
      width: var(--slider-dot);
      height: var(--slider-dot);
      background: var(--secondary-text-color);
      border-radius: 50%;
      opacity: 50%;

      &.is-hover {
        background: var(--text-color);
        opacity: 100%;
        scale: 2;
      }
    }

    .slider_mark {
      position: absolute;
      inset-inline-start: calc(
        var(--slider-thumb-width) / 2 + var(--slider-mark) *
          (100% - var(--slider-thumb-width)) - var(--slider-line) / 4
      );
      top: calc(50% - 0.375rem);
      width: calc(var(--slider-line) / 2);
      height: 0.75rem;
      background: var(--secondary-text-color);
      border-radius: var(--slider-line);
    }

    .slider_input {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      margin: 0;
      background: transparent;
      appearance: none;
      border-radius: var(--base-radius);

      &:focus-visible {
        @mixin focus;
      }

      &::-webkit-slider-runnable-track {
        height: 100%;
        background: transparent;
      }

      &::-moz-range-track {
        height: 100%;
        background: transparent;
      }

      html:not(.is-quiet-cursor) & {
        cursor: pointer;

        .slider_area.is-thumb-hover & {
          cursor: grab;
        }

        .slider_area.is-dragging & {
          cursor: grabbing;
        }
      }

      &::-webkit-slider-thumb {
        width: var(--slider-thumb-width);
        height: var(--slider-thumb-height);
        appearance: none;
      }

      &::-moz-range-thumb {
        width: var(--slider-thumb-width);
        height: var(--slider-thumb-height);
        background: transparent;
        border: none;
      }
    }

    .slider_thumb {
      --icon-size: 1rem;

      position: absolute;
      inset-inline-start: calc(
        var(--slider-progress) * (100% - var(--slider-thumb-width))
      );
      top: calc(50% - var(--slider-thumb-height) / 2);
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--slider-thumb-width);
      height: var(--slider-thumb-height);
      color: var(--secondary-text-color);
      pointer-events: none;
      background: --tune-background(--current);
      border-radius: var(--base-radius);
      box-shadow: var(--hard-button-shadow);

      .slider_area.is-thumb-hover &,
      .slider_input:focus-visible + & {
        background: --tune-background(--current --flat-button-hover);
      }

      .slider_area.is-grabbed & {
        box-shadow: var(--flat-control-shadow);
        translate: 0 1px;
      }

      & > svg {
        opacity: 40%;
      }
    }
  }
</style>
