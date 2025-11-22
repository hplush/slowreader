<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    align = 'start',
    children,
    controls,
    gap = 'm',
    height = 'auto',
    justify = 'start',
    role,
    row = false,
    width = 'stretch'
  }: {
    align?: 'baseline' | 'center' | 'end' | 'start'
    children: Snippet
    controls?: string
    gap?: 'l' | 'm' | 's' | 'xl' | 'xs' | 'xxl'
    height?: 'auto' | 'stretch'
    justify?: 'center' | 'end' | 'space-between' | 'start'
    role?: 'menu' | 'menuitem'
    row?: boolean
    width?: 'auto' | 'stretch'
  } = $props()
</script>

<!-- We need tabindex on <div> for simpler focus to edit/delete -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<div
  class="stack"
  class:is-align-baseline={align === 'baseline'}
  class:is-align-center={align === 'center'}
  class:is-align-end={align === 'end'}
  class:is-align-start={align === 'start'}
  class:is-gap-l={gap === 'l'}
  class:is-gap-m={gap === 'm'}
  class:is-gap-s={gap === 's'}
  class:is-gap-xl={gap === 'xl'}
  class:is-gap-xs={gap === 'xs'}
  class:is-gap-xxl={gap === 'xxl'}
  class:is-height-stretch={height === 'stretch'}
  class:is-justify-center={justify === 'center'}
  class:is-justify-end={justify === 'end'}
  class:is-justify-space-between={justify === 'space-between'}
  class:is-justify-start={justify === 'start'}
  class:is-row={row}
  class:is-width-auto={width === 'auto'}
  class:is-width-stretch={width === 'stretch'}
  aria-controls={controls}
  {role}
  tabindex={controls ? 0 : null}
>
  {@render children()}
</div>

<style>
  :global {
    .stack {
      display: flex;
      flex-direction: column;

      &[aria-controls] {
        border-radius: var(--base-radius);
      }

      &.is-align-start {
        align-items: flex-start;
      }

      &.is-align-center {
        align-items: center;
      }

      &.is-align-end {
        align-items: flex-end;
      }

      &.is-align-baseline {
        align-items: baseline;
      }

      &.is-justify-center {
        justify-content: center;
      }

      &.is-justify-end {
        justify-content: flex-end;
      }

      &.is-justify-space-between {
        justify-content: space-between;
      }

      &.is-justify-start {
        justify-content: flex-start;
      }

      &.is-width-auto {
        width: auto;
      }

      &.is-width-stretch {
        width: stretch;
      }

      &.is-height-stretch {
        flex-grow: 1;
        min-height: 100%;
      }

      &.is-row {
        flex-direction: row;
        padding: 0 var(--stack-padding);
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

      &.is-gap-xs {
        gap: 0.125rem;
      }

      &.is-gap-s {
        gap: 0.375rem;
      }
    }
  }
</style>
