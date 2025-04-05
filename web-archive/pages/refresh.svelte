<script lang="ts">
  import {
    isRefreshing,
    stopRefreshing,
    refreshMessages as t
  } from '@slowreader/core'
</script>

{#if $isRefreshing}
  <button onclick={stopRefreshing}>{$t.stop}</button>
{/if}
