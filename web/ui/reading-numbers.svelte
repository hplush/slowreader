<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'

  let {
    fast,
    legend = false,
    note,
    slow
  }: {
    fast: number | string
    legend?: boolean
    note?: string
    slow: number | string
  } = $props()
</script>

<div class="reading-numbers" class:is-legend={legend}>
  <dl class="reading-numbers_list">
    <dt class="reading-numbers_title is-comfort-mode is-slow">{$t.slow}</dt>
    <dd class="reading-numbers_value is-comfort-mode">{slow}</dd>
    <dt class="reading-numbers_title is-non-comfort-mode is-fast">
      {$t.fast}
    </dt>
    <dd class="reading-numbers_value is-non-comfort-mode">{fast}</dd>
  </dl>
  {#if note}
    <div class="reading-numbers_note">{note}</div>
  {/if}
</div>

<style>
  :global {
    .reading-numbers {
      min-width: 15rem;
      text-align: center;
    }

    .reading-numbers_list {
      display: grid;
      grid-template-rows: auto auto;
      grid-template-columns: 1fr 1fr;
      grid-auto-flow: column;
    }

    .reading-numbers_title {
      padding: 0.25rem 1rem 0 1rem;
      background: --tune-background(--gutter);

      &:first-of-type {
        border-radius: var(--base-radius) 0 0 0;
      }

      &:last-of-type {
        border-radius: 0 var(--base-radius) 0 0;
      }

      .reading-numbers.is-legend & {
        display: flex;
        gap: 0.375rem;
        align-items: center;
        justify-content: center;
      }

      .reading-numbers.is-legend &::before {
        width: 0.5rem;
        height: 0.5rem;
        content: '';
        border-radius: 50%;
      }

      &.is-slow::before {
        background: var(--usage-slow-color);
      }

      &.is-fast::before {
        background: var(--usage-fast-color);
      }
    }

    .reading-numbers_value {
      padding: 0.125rem 1rem 0.75rem 1rem;
      font: var(--counter-font);
      background: --tune-background(--gutter);

      &:first-of-type {
        border-radius: 0 0 0 var(--base-radius);
      }

      &:last-of-type {
        border-radius: 0 0 var(--base-radius) 0;
      }
    }

    .reading-numbers_note {
      padding: 0.25rem 0 0 0;
      font: var(--secondary-font);
    }
  }
</style>
