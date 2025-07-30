<script lang="ts">
  import type { Snippet } from 'svelte'

  let {
    children,
    padding = 'normal',
    variant = 'main'
  }: {
    children: Snippet
    padding?: 'no-top' | 'normal'
    variant?: 'main' | 'transparent'
  } = $props()
</script>

<div
  class="card"
  class:is-main={variant === 'main'}
  class:is-no-top-padding={padding === 'no-top'}
>
  {@render children()}
</div>

<style lang="postcss">
  :global {
    .card {
      padding: 1rem;
      border-radius: calc(1rem + var(--base-radius));

      &.is-main {
        @mixin background var(--main-land-color);
      }

      &.is-no-top-padding {
        padding-top: 0;
      }
    }
  }
</style>
