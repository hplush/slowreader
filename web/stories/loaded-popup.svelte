<script generics="SomePopup extends Popup" lang="ts">
  import type { LoadedPopup, Popup } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  let {
    loaded,
    popup
  }: { loaded: Snippet<[LoadedPopup<SomePopup>]>; popup: SomePopup } = $props()
  let loading = popup.loading
</script>

{#if $loading}
  loading
{:else if popup.notFound}
  404
{:else}
  {@render loaded(popup as LoadedPopup)}
{/if}
