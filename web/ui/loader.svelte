<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'

  let {
    label = $t.loading,
    size = 'normal',
    value,
    variant = 'auto'
  }: {
    label?: string
    size?: 'normal' | 'wide'
    value?: boolean | number
    variant?: 'accent' | 'auto'
  } = $props()
</script>

<progress
  class="loader"
  class:is-accent={variant === 'accent'}
  class:is-wide={size === 'wide'}
  {@attach progress => {
    if (typeof value === 'number') {
      progress.value = value
    } else {
      progress.removeAttribute('value')
    }
  }}
  aria-label={label}
></progress>

<style>
  /* Styles are in main/loader.css */
  :global {
    .loader.is-accent {
      --loader-background: oklch(1 0 0 / 20%);
      --loader-bar: oklch(1 0 0);
    }

    .loader.is-wide {
      min-width: 100%;
    }

    @media (prefers-reduced-motion: reduce) {
      .loader {
        background: repeating-linear-gradient(
          -45deg,
          var(--loader-bar),
          var(--loader-bar) 0.625rem,
          var(--loader-background) 0.625rem,
          var(--loader-background) 1.25rem
        );
      }

      .loader::after {
        display: none;
      }

      .loader::-webkit-progress-value {
        background: transparent;
        animation: none !important;
      }

      .loader::-moz-progress-bar {
        background: transparent;
        animation: none !important;
      }
    }
  }
</style>
