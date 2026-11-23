<script lang="ts">
  import {
    type ExperimentPopup,
    getPopupId,
    aboutMessages as t
  } from '@slowreader/core'

  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'

  let { popup }: { popup: ExperimentPopup } = $props()
  let { enabled, records } = $derived(popup)
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  <Stack gap="l" height="stretch">
    <Switch
      label={popup.experiment.title}
      note={popup.experiment.description}
      store={enabled}
      variant="title"
    />
    {#if popup.experiment.collects && $enabled}
      <Output
        label={$t.experimentRecords}
        multiline
        onbeforecopy={popup.updateRecords}
        value={$records}
      />
    {/if}
  </Stack>
</Popup>
