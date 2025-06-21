<script lang="ts">
  import { onDestroy } from 'svelte'

  import Loader from '../ui/loader.svelte'

  let pageLoader = [...document.body.children].find(i => i.id === 'loader')

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
