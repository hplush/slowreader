<script lang="ts">
  import { mdiHandBackLeft } from '@mdi/js'
  import { busy, type BusyValue, commonMessages as t } from '@slowreader/core'

  import Captioned from '../ui/captioned.svelte'
  import Loader from '../ui/loader.svelte'
  import Note from '../ui/note.svelte'

  let operation: BusyValue = $derived($busy || { label: '' })
</script>

{#snippet warning()}
  <Note icon={mdiHandBackLeft} variant="dangerous">{$t.dontClose}</Note>
{/snippet}

<Captioned
  caption={operation.label}
  labelled
  note={operation.blocking ? warning : undefined}
>
  <Loader
    label={operation.label || undefined}
    track="app"
    value={operation.progress || undefined}
  />
</Captioned>
