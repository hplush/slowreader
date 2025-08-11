<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    center,
    children,
    gap = 'm',
    row = false
  }: {
    center?: boolean
    children: Snippet
    gap?: 'l' | 'm' | 's' | 'xl' | 'xxl'
    row?: boolean
  } = $props()
</script>

<div
  class="stack"
  class:is-center={center}
  class:is-gap-l={gap === 'l'}
  class:is-gap-m={gap === 'm'}
  class:is-gap-s={gap === 's'}
  class:is-gap-xl={gap === 'xl'}
  class:is-gap-xxl={gap === 'xxl'}
  class:is-row={row}
>
  {@render children()}
</div>

<style>
  :global {
    .stack {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: stretch;

      &.is-center {
        align-items: center;
      }

      &.is-row {
        flex-direction: row;
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
