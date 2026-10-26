<script lang="ts">
  import { mdiCheckboxMultipleMarkedOutline, mdiFire } from '@mdi/js'
  import { type ListReader, feedsMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import Button from '../../ui/button.svelte'
  import Pagination from '../../ui/pagination.svelte'
  import Posts from '../../ui/posts.svelte'
  import Stack from '../../ui/stack.svelte'

  let { reader, reading }: { reader: ListReader; reading: 'fast' | 'slow' } =
    $props()
  let { list, pages, readingPage } = $derived(reader)
</script>

<Posts autoread list={$list} />
{#if $list.some(post => !post.read)}
  <Stack align="center">
    <Button
      anchor="read-page"
      icon={mdiCheckboxMultipleMarkedOutline}
      loader={$readingPage}
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
{#if reading === 'fast' && $pages.page > 0}
  <Stack padding="xl" reading="slow">
    <Button anchor="go-useful" href={getURL('slow')} icon={mdiFire} size="wide">
      {$t.goUseful}
    </Button>
  </Stack>
{/if}
<Pagination pages={$pages} />
