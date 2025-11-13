<script lang="ts">
  import type { FeedReader } from '@slowreader/core'

  let { reader }: { reader: FeedReader } = $props()
  let { list } = reader
</script>

Feed {$list.length}
