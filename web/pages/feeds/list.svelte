<script lang="ts">
  import type { ListReader } from '@slowreader/core'

  import Posts from '../../ui/posts.svelte'

  let { reader }: { reader: ListReader } = $props()
  let { list } = reader
</script>

<Posts autoread list={$list} />
