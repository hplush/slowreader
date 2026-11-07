<script lang="ts">
  import {
    showUsageBalance,
    navbarMessages as t,
    trackUsage,
    usageBalance,
    usageMood
  } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'

  const MOUTHS = {
    bad: 'M5.5 11.5Q8 9.5 10.5 11.5',
    good: 'M5.5 10Q8 12.5 10.5 10',
    neutral: 'M5.5 10.75H10.5'
  }

  const LABELS = {
    bad: 'balanceBad',
    good: 'balanceGood',
    neutral: 'balanceNeutral'
  } as const
</script>

<div
  class="navbar-balance"
  class:is-hidden={!$showUsageBalance || !$trackUsage}
>
  <span class="navbar-balance_mark is-start"></span>
  <span class="navbar-balance_mark is-middle"></span>
  <span class="navbar-balance_mark is-end"></span>
  <span
    style:--navbar-balance-position="{($usageBalance + 1) * 50}%"
    class="navbar-balance_thumb"
  >
    <span class="navbar-balance_pointer"></span>
    <span class="navbar-balance_shadow"></span>
    <a
      class="navbar-balance_marker"
      aria-label={$t[LABELS[$usageMood]]}
      href={getURL('coach')}
      title={$t[LABELS[$usageMood]]}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <circle cx="6" cy="6.75" r="1" />
        <circle cx="10" cy="6.75" r="1" />
        <path d={MOUTHS[$usageMood]} />
      </svg>
    </a>
  </span>
</div>

<style lang="postcss">
  :global {
    .navbar-balance {
      --navbar-balance-inset: calc(var(--base-radius) + var(--slider-padding));

      position: relative;
      z-index: 3;
      display: block;
      height: 1rem;
      margin-inline: calc(
        var(--navbar-padding) + var(--control-height) + 0.125rem +
          var(--navbar-balance-inset)
      );
      margin-top: calc(-1 * var(--navbar-padding));
      pointer-events: none;

      &.is-hidden {
        visibility: hidden;
      }

      @media (--no-desktop) {
        position: absolute;
        inset-inline: 0;
        top: 0;
        width: calc(
          min(
              var(--thin-content-width) - 2 * var(--control-height) - 0.25rem,
              100vw - 2rem - 2 * var(--control-height) - 0.25rem
            ) -
            2 * var(--navbar-balance-inset)
        );
        margin: 0 auto;
      }
    }

    .navbar-balance_mark {
      position: absolute;
      top: 0;
      width: var(--min-size);
      height: 0.3125rem;
      background: var(--border-color);

      &.is-start {
        inset-inline-start: 0;
      }

      &.is-middle {
        inset-inline-start: 50%;
      }

      &.is-end {
        inset-inline-end: 0;
      }
    }

    .navbar-balance_thumb {
      position: absolute;
      inset: 0;
      transition: translate 1s ease-in-out;
      translate: var(--navbar-balance-position) 0;

      &:dir(rtl) {
        translate: calc(-1 * var(--navbar-balance-position)) 0;
      }
    }

    .navbar-balance_pointer {
      position: absolute;
      inset-inline-start: 0;
      top: 0;
      width: var(--min-size);
      height: 0.25rem;
      background: --tune-background(--balance-marker);
      margin-inline-start: calc(-0.5 * var(--min-size));

      @media (--no-desktop) {
        display: none;
      }
    }

    .navbar-balance_shadow {
      display: none;

      @media (--no-desktop) {
        position: absolute;
        inset-inline-start: 0;
        top: 0;
        display: block;
        width: 0.875rem;
        height: 0.875rem;
        border-radius: 50%;
        margin-inline-start: -0.4375rem;
        box-shadow: var(--bottom-panel-shadow);
        clip-path: inset(-1rem -1rem 50% -1rem);
        translate: 0 -50%;
      }
    }

    .navbar-balance_marker {
      position: absolute;
      inset-inline-start: 0;
      top: 0.125rem;
      width: 0.875rem;
      height: 0.875rem;
      color: var(--secondary-text-color);
      background: --tune-background(--balance-marker);
      margin-inline-start: -0.4375rem;
      border-radius: 50%;
      pointer-events: auto;

      &:hover,
      &:active,
      &:focus-visible {
        color: var(--text-color);
      }

      @media (--no-desktop) {
        top: 0;
        translate: 0 -50%;
      }

      > svg {
        display: block;
        width: 100%;
        height: 100%;
      }

      circle {
        fill: currentcolor;
      }

      path {
        fill: none;
        stroke: currentcolor;
        stroke-linecap: round;
        stroke-width: 1.25;
      }
    }
  }
</style>
