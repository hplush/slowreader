<script lang="ts">
  import type { WelcomeReader } from '@slowreader/core'

  let { reader }: { reader: WelcomeReader } = $props()
</script>

Welcome {reader.reading}
