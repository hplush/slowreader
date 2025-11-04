<script lang="ts">
  import type { BasePopup } from '@slowreader/core'

  let { popup }: { popup: BasePopup } = $props()

  import Loader from '../ui/loader.svelte'
  import Popup from '../ui/popup.svelte'
</script>

<Popup id={`${popup.uniqueId}-loading`}>
  <Loader />
</Popup>
