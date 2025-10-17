<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'

  let {
    label = $t.loading,
    value,
    variant = 'auto'
  }: {
    label?: string
    value?: number
    variant?: 'accent' | 'auto'
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
  class:is-accent={variant === 'accent'}
  aria-label={label}
></progress>

<style>
  /* Styles are in main/loader.css */
  :global {
    .loader.is-accent {
      --loader-background: oklch(1 0 0 / 20%);
      --loader-bar: oklch(1 0 0);
    }
  }
</style>
