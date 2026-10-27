<script lang="ts">
  import {
    mdiArrowLeft,
    mdiArrowRight,
    mdiCheckboxMultipleMarkedOutline,
    mdiFire
  } from '@mdi/js'
  import { feedsMessages as t } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from './button.svelte'
  import Stack from './stack.svelte'

  let {
    loader,
    next,
    onread,
    page,
    prev
  }: {
    loader: boolean
    next: string | undefined
    onread: () => void
    page: number
    prev: string | undefined
  } = $props()
</script>

{#if page > 0}
  <Stack padding="xl" reading="slow">
    <Button anchor="go-useful" href={getURL('slow')} icon={mdiFire} size="wide">
      {$t.goUseful}
    </Button>
  </Stack>
{/if}

<Stack gap="s" row>
  {#if prev}
    <Button href={`?from=${prev}`} icon={mdiArrowLeft} size="icon">
      {$t.prevPage}
    </Button>
  {/if}
  <Button
    anchor="read-page"
    icon={mdiCheckboxMultipleMarkedOutline}
    {loader}
    onclick={onread}
    size="wide"
    variant={loader ? 'secondary' : 'attention'}
  >
    {#if next}
      {$t.readPageAndNext}
    {:else}
      {$t.readPage}
    {/if}
  </Button>
  {#if next}
    <Button
      anchor="next-page"
      href={`?from=${next}`}
      icon={mdiArrowRight}
      size="icon"
    >
      {$t.nextPage}
    </Button>
  {/if}
</Stack>
