<script lang="ts">
  import type { EmptyReader } from '@slowreader/core'

  let { reader }: { reader: EmptyReader } = $props()
</script>

Empty {reader.reading}
