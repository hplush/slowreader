<script lang="ts">
  import type { ListReader } from '@slowreader/core'

  import PostLinks from '../../ui/post-links.svelte'

  let { reader }: { reader: ListReader } = $props()
  let { list } = $derived(reader)
</script>

<PostLinks autoread list={$list} />
