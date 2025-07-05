<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'

  let {
    label = $t.loading,
    value
  }: {
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

<progress bind:this={progress} class="loader" aria-label={label} />

<style>
  /* Styles are in main/loader.css */
</style>
