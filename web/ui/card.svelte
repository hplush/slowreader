<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    padding = 'normal',
    variant = 'main',
    width = 'auto'
  }: {
    children: Snippet
    padding?: 'no-top' | 'normal'
    variant?: 'main' | 'transparent'
    width?: 'auto' | 'stretch'
  } = $props()
</script>

<div
  class="card"
  class:is-main={variant === 'main'}
  class:is-no-top-padding={padding === 'no-top'}
  class:is-stretch={width === 'stretch'}
>
  {@render children()}
</div>

<style lang="postcss">
  :global {
    .card {
      padding: 1rem;
      border-radius: calc(1rem + var(--base-radius));

      @media (--mobile) {
        margin-inline: -0.5rem;
      }

      &.is-main {
        @mixin background var(--main-land-color);
      }

      &.is-no-top-padding {
        padding-top: 0;
      }

      &.is-stretch {
        align-self: stretch;
        margin-inline: -1rem;
      }
    }
  }
</style>
