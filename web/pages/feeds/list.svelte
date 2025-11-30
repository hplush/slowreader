<script lang="ts">
  import type { ListReader } from '@slowreader/core'

  import Pagination from '../../ui/pagination.svelte'
  import Posts from '../../ui/posts.svelte'

  let { reader }: { reader: ListReader } = $props()
  let { list, pages } = reader
</script>

<Posts autoread list={$list} />
<Pagination pages={$pages} />
