<script lang="ts">
  import type { BasePopup } from '@slowreader/core'

  let { popup }: { popup: BasePopup } = $props()

  import Popup from '../ui/popup.svelte'
</script>

<Popup id={`${popup.id}-not-found`}>404</Popup>
