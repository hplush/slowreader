<script lang="ts">
  import {
    mdiArrowLeft,
    mdiArrowRight,
    mdiCheckboxMultipleMarkedOutline
  } from '@mdi/js'
  import { type FeedReader, feedsMessages as t } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Feed from '../../ui/feed/index.svelte'
  import Stack from '../../ui/stack.svelte'

  let { reader }: { reader: FeedReader } = $props()
  let { authors, hasNext, list, nextFrom, prevFrom } = $derived(reader)
</script>

<Feed authors={$authors} posts={$list} />

<Stack gap="s" row>
  {#if $prevFrom}
    <Button href={`?from=${$prevFrom}`} icon={mdiArrowLeft} size="icon">
      {$t.prevPage}
    </Button>
  {/if}
  <Button
    icon={mdiCheckboxMultipleMarkedOutline}
    onclick={reader.readAndNext}
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
    <Button href={`?from=${$nextFrom}`} icon={mdiArrowRight} size="icon">
      {$t.nextPage}
    </Button>
  {/if}
</Stack>
