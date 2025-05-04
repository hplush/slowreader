<script lang="ts">
  import { busyDuring } from '@slowreader/core'
  import { onDestroy } from 'svelte'

  import Loader from '../ui/loader.svelte'

  let pageLoader = [...document.body.children].find(i => i.id === 'loader')

  busyDuring(async () => {
    await new Promise(resolve => {
      setTimeout(() => {
        pageLoader?.remove()
        resolve(true)
      }, 10000)
    })
  })

  onDestroy(() => {
    pageLoader?.remove()
  })
</script>

<div class="busy">
  {#if !pageLoader}
    <Loader zoneId="main" />
  {/if}
</div>

<style>
  :global {
    .busy {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
</style>
