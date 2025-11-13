<script lang="ts">
  import type { ListReader } from '@slowreader/core'

  let { reader }: { reader: ListReader } = $props()
  let { list } = reader
</script>

List {$list.length}
