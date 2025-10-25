<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    align = 'start',
    children,
    gap = 'm',
    row = false
  }: {
    align?: 'center' | 'end' | 'start'
    children: Snippet
    gap?: 'l' | 'm' | 's' | 'xl' | 'xxl' | 'xxxl'
    row?: boolean
  } = $props()
</script>

<div
  class="stack"
  class:is-align-center={align === 'center'}
  class:is-align-end={align === 'end'}
  class:is-align-start={align === 'start'}
  class:is-gap-l={gap === 'l'}
  class:is-gap-m={gap === 'm'}
  class:is-gap-s={gap === 's'}
  class:is-gap-xl={gap === 'xl'}
  class:is-gap-xxl={gap === 'xxl'}
  class:is-gap-xxxl={gap === 'xxxl'}
  class:is-row={row}
>
  {@render children()}
</div>

<style>
  :global {
    .stack {
      display: flex;
      flex-direction: column;
      width: stretch;

      &.is-align-start {
        align-items: flex-start;
      }

      &.is-align-center {
        align-items: center;
      }

      &.is-align-end {
        align-items: flex-end;
      }

      &.is-row {
        flex-direction: row;
      }

      &.is-gap-xxxl {
        gap: 6rem;
      }

      &.is-gap-xxl {
        gap: 3rem;
      }

      &.is-gap-xl {
        gap: 1.5rem;
      }

      &.is-gap-l {
        gap: 1rem;
      }

      &.is-gap-m {
        gap: 0.625rem;
      }

      &.is-gap-s {
        gap: 0.375rem;
      }
    }
  }
</style>
