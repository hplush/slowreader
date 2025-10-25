<script lang="ts">
  import type { Popup } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  let { children, popup }: { children: Snippet; popup: Popup } = $props()
  let loading = popup.loading
</script>

{#if $loading}
  loading
{:else if popup.notFound}
  404
{:else}
  {@render children()}
{/if}
