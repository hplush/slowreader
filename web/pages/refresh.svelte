<script lang="ts">
  import {
    isRefreshing,
    stopRefreshing,
    refreshMessages as t
  } from '@slowreader/core'
</script>

{#if $isRefreshing}
  <button on:click={stopRefreshing}>{$t.stop}</button>
{/if}
