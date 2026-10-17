<script generics="SomePopup extends Popup" lang="ts">
  import type { LoadedPopup, Popup } from '@slowreader/core'
  import type { Snippet } from 'svelte'

  import ErrorPopup from '../popups/error.svelte'

  let {
    loaded,
    popup
  }: { loaded: Snippet<[LoadedPopup<SomePopup>]>; popup: SomePopup } = $props()

  let loading = $derived(popup.loading)
</script>

{#if $loading}
  loading
{:else if popup.notFound || popup.error}
  <ErrorPopup {popup} />
{:else}
  {@render loaded(popup as LoadedPopup<SomePopup>)}
{/if}
