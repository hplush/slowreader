<script lang="ts">
  import { getPopupId, type MenuPopup } from '@slowreader/core'

  import NavbarFast from '../ui/navbar/fast.svelte'
  import NavbarOther from '../ui/navbar/other.svelte'
  import NavbarSlow from '../ui/navbar/slow.svelte'
  import Popup from '../ui/popup.svelte'

  let { popup }: { popup: MenuPopup } = $props()
</script>

<Popup
  id={getPopupId(popup.name, popup.param)}
  navbar
  reading={popup.param === 'fast' ? 'fast' : 'slow'}
>
  {#if popup.param === 'slow'}
    <NavbarSlow />
  {:else if popup.param === 'fast'}
    <NavbarFast />
  {:else}
    <NavbarOther />
  {/if}
</Popup>
