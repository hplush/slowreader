<script lang="ts">
  import { busy, type BusyValue } from '@slowreader/core'

  import Captioned from '../ui/captioned.svelte'
  import Loader from '../ui/loader.svelte'

  let operation: BusyValue = $derived($busy || { label: '' })
</script>

<Captioned caption={operation.label} labelled>
  <Loader
    label={operation.label || undefined}
    track="app"
    value={operation.progress || undefined}
  />
</Captioned>
