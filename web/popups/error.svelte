<script lang="ts">
  import { mdiBookOpenPageVariant, mdiFire, mdiOpenInNew } from '@mdi/js'
  import {
    type BasePopup,
    getPopupUrl,
    postMessages,
    commonMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { popup }: { popup: BasePopup } = $props()
  let url = $derived(getPopupUrl(popup))
</script>

<Popup id={`${popup.uniqueId}-error`}>
  <Stack align="center" gap="xl">
    <PageIcon extra={mdiFire} path={mdiBookOpenPageVariant} />
    <Title center>{popup.error ?? $t.popupNotFound}</Title>
    {#if url}
      <Button href={url} icon={mdiOpenInNew} target="_blank">
        {popup.name === 'post' ? $postMessages.url : $t.popupOpenFeed}
      </Button>
    {/if}
  </Stack>
</Popup>
