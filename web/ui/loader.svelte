<script lang="ts" module>
  // On the app start the loader from index.html is replaced by this component.
  // It is the same animation, but the new element starts it from the beginning,
  // so the bar jumps. We move every loader to the phase of the first one:
  // the animation continues on the app start and all loaders bounce in sync.
  let phase: number | undefined

  function syncPhase(loader: Element): void {
    if (phase === undefined) {
      let previous = document.querySelector('#loader') ?? loader
      let start = previous.getAnimations({ subtree: true })[0]?.startTime
      if (start === null || start === undefined) return
      phase = Number(start)
    }
    for (let animation of loader.getAnimations({ subtree: true })) {
      animation.startTime = phase
    }
  }
</script>

<script lang="ts">
  import { reportLoader, commonMessages as t } from '@slowreader/core'

  let {
    label = $t.loading,
    size = 'normal',
    track = 'unnamed',
    value,
    variant = 'auto'
  }: {
    label?: string
    size?: 'normal' | 'wide'
    track?: string
    value?: boolean | number
    variant?: 'accent' | 'auto'
  } = $props()
</script>

<progress
  class="loader"
  class:is-accent={variant === 'accent'}
  class:is-wide={size === 'wide'}
  {@attach syncPhase}
  {@attach progress => {
    if (typeof value === 'number') {
      progress.value = value
    } else {
      progress.removeAttribute('value')
    }
  }}
  {@attach () => reportLoader(track)}
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
