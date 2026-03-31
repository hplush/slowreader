<script lang="ts">
  import { mdiBookOpenPageVariant, mdiFire } from '@mdi/js'
  import { type BasePopup, commonMessages as t } from '@slowreader/core'

  import PageIcon from '../ui/page-icon.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { popup }: { popup: BasePopup } = $props()
</script>

<Popup id={`${popup.uniqueId}-not-found`}>
  <Stack align="center" gap="xl">
    <PageIcon extra={mdiFire} path={mdiBookOpenPageVariant} />
    <Title>{$t.popupNotFound}</Title>
  </Stack>
</Popup>
