<script lang="ts">
  import {
    mdiArrowLeft,
    mdiArrowRight,
    mdiCheckboxMultipleMarkedOutline,
    mdiFire
  } from '@mdi/js'
  import { type FeedReader, feedsMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import Button from '../../ui/button.svelte'
  import Feed from '../../ui/feed/index.svelte'
  import Stack from '../../ui/stack.svelte'

  let {
    feedUrl,
    reader,
    reading
  }: { feedUrl?: string; reader: FeedReader; reading: 'fast' | 'slow' } =
    $props()
  let {
    authors,
    hasNext,
    list,
    nextFrom,
    page,
    prevFrom,
    readingPage,
    userPostUrl
  } = $derived(reader)
</script>

<Feed authors={$authors} {feedUrl} posts={$list} userPostUrl={$userPostUrl} />

{#if reading === 'fast' && $page > 0}
  <Stack padding="xl" reading="slow">
    <Button anchor="go-useful" href={getURL('slow')} icon={mdiFire} size="wide">
      {$t.goUseful}
    </Button>
  </Stack>
{/if}

<Stack gap="s" row>
  {#if $prevFrom}
    <Button href={`?from=${$prevFrom}`} icon={mdiArrowLeft} size="icon">
      {$t.prevPage}
    </Button>
  {/if}
  <Button
    anchor="read-page"
    icon={mdiCheckboxMultipleMarkedOutline}
    loader={$readingPage}
    onclick={reader.readPage}
    size="wide"
    variant="attention"
  >
    {#if $hasNext}
      {$t.readPageAndNext}
    {:else}
      {$t.readPage}
    {/if}
  </Button>
  {#if $hasNext}
    <Button
      anchor="next-page"
      href={`?from=${$nextFrom}`}
      icon={mdiArrowRight}
      size="icon"
    >
      {$t.nextPage}
    </Button>
  {/if}
</Stack>
