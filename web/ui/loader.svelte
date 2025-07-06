<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'

  let {
    inverse,
    label = $t.loading,
    value
  }: {
    inverse?: boolean
    label?: string
    value?: number
  } = $props()

  let progress: HTMLProgressElement | undefined

  $effect(() => {
    if (progress) {
      if (typeof value === 'number') {
        progress.value = value
      } else {
        progress.removeAttribute('value')
      }
    }
  })
</script>

<progress
  bind:this={progress}
  class="loader"
  class:is-inverse={inverse}
  aria-label={label}
></progress>

<style>
  /* Styles are in main/loader.css */
  :global {
    .loader.is-inverse {
      @media (prefers-color-scheme: light) {
        --loader-background: var(--loader-background-dark);
        --loader-bar: var(--loader-bar-dark);
      }

      @media (prefers-color-scheme: dark) {
        --loader-background: var(--loader-background-light);
        --loader-bar: var(--loader-bar-light);
      }

      .is-light-theme & {
        --loader-background: var(--loader-background-dark);
        --loader-bar: var(--loader-bar-dark);
      }

      .is-dark-theme & {
        --loader-background: var(--loader-background-light);
        --loader-bar: var(--loader-bar-light);
      }
    }
  }
</style>
