<script lang="ts">
  import {
    mdiArrowLeft,
    mdiArrowRight,
    mdiCheckboxMultipleMarkedOutline
  } from '@mdi/js'
  import { type FeedReader, feedsMessages as t } from '@slowreader/core'

  import Button from '../../ui/button.svelte'
  import Feed from '../../ui/feed.svelte'
  import Stack from '../../ui/stack.svelte'

  let { reader }: { reader: FeedReader } = $props()
  let { hasNext, list, nextFrom, prevFrom } = $derived(reader)
</script>

<Feed list={$list} />

<Stack gap="s" row>
  {#if $prevFrom}
    <Button href={`?from=${$prevFrom}`} icon={mdiArrowLeft} size="icon">
      {$t.nextPage}
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
