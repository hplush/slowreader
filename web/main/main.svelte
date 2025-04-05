<script lang="ts">
  import { busy, router } from '@slowreader/core'

  import Busy from '../pages/busy.svelte'
</script>

{#if $busy}
  <Busy />
{:else}
  {$router.route}
{/if}
