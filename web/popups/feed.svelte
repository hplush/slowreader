<script lang="ts">
  import type { FeedPopup } from '@slowreader/core'

  import Popup from '../ui/popup.svelte'

  let { popup }: { popup: FeedPopup } = $props()
</script>

<Popup id={popup.id}>
  {popup.param}
</Popup>
