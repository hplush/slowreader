<script lang="ts">
  import {
    mdiFireplace,
    mdiFood,
    mdiPlusCircleOutline,
    mdiTrashCanOutline
  } from '@mdi/js'
  import {
    changeFeed,
    type FeedPopup,
    organizeMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Input from '../ui/input.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'

  let { popup }: { popup: FeedPopup } = $props()

  let { feed } = popup
</script>

<Popup id={popup.id}>
  {#snippet header()}
    {#if !$feed}
      <Button icon={mdiPlusCircleOutline} onclick={popup.add} variant="main">
        {$t.addFeed}
      </Button>
    {:else}
      <Button
        icon={mdiTrashCanOutline}
        onclick={popup.remove}
        variant="secondary-dangerous"
      >
        {$t.deleteFeed}
      </Button>
    {/if}
  {/snippet}
  <Stack gap="l">
    <Output label={$t.feedUrl} value={popup.param} />
    {#if $feed}
      <Input
        label={$t.title}
        onchange={title => {
          changeFeed($feed.id, { title })
        }}
        value={$feed.title}
      />
      <Radio
        label={$t.type}
        onchange={reading => {
          changeFeed($feed.id, { reading })
        }}
        value={$feed.reading}
        values={[
          ['slow', $t.slow, mdiFireplace],
          ['fast', $t.fast, mdiFood]
        ]}
      />
    {/if}
  </Stack>
</Popup>
