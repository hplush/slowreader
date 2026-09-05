<script lang="ts">
  import { mdiCheckboxMultipleMarkedOutline } from '@mdi/js'
  import { type ListReader, feedsMessages as t } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Pagination from '../../ui/pagination.svelte'
  import Posts from '../../ui/posts.svelte'
  import Stack from '../../ui/stack.svelte'

  let { reader }: { reader: ListReader } = $props()
  let { list, pages } = $derived(reader)
</script>

<Posts autoread list={$list} />
{#if $list.some(post => !post.read)}
  <Stack align="center">
    <Button
      anchor="read-page"
      icon={mdiCheckboxMultipleMarkedOutline}
      onclick={reader.readPage}
      size="pill"
    >
      {#if $pages.hasNext}
        {$t.readPageAndNext}
      {:else}
        {$t.readPage}
      {/if}
    </Button></Stack
  >
{/if}
<Pagination pages={$pages} />
