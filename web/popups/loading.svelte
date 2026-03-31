<script lang="ts">
  import type { BasePopup } from '@slowreader/core'

  import Loader from '../ui/loader.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'

  let { popup }: { popup: BasePopup } = $props()
</script>

<Popup id={`${popup.uniqueId}-loading`}>
  <Stack height="stretch" justify="center">
    <Loader />
  </Stack>
</Popup>
