<script lang="ts">
  import type { FeedUrlPopup } from '@slowreader/core'

  import Popup from '../ui/popup.svelte'

  let { popup }: { popup: FeedUrlPopup } = $props()
</script>

<Popup id={popup.id}>
  {popup.param}
</Popup>
