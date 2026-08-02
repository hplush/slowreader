<script lang="ts">
  import { busy } from '@slowreader/core'

  import Captioned from '../ui/captioned.svelte'
  import Loader from '../ui/loader.svelte'

  let operation = $derived($busy || {})
</script>

<Captioned caption={operation.label} labelled>
  <Loader label={operation.label} track="app" value={operation.progress} />
</Captioned>
