<script lang="ts">
  import { isRefreshing, stopRefreshing } from '@slowreader/core'
  import { refreshMessages as t } from '@slowreader/core/messages'
</script>

{#if $isRefreshing}
  <button on:click={stopRefreshing}>{$t.stop}</button>
{/if}
