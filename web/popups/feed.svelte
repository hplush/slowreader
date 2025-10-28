<script lang="ts">
  import { mdiPlusCircleOutline, mdiTrashCanOutline } from '@mdi/js'
  import {
    addCategory,
    changeFeed,
    type FeedPopup,
    organizeMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Input from '../ui/input.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Radio from '../ui/radio.svelte'
  import Select from '../ui/select.svelte'
  import Stack from '../ui/stack.svelte'

  let { popup }: { popup: FeedPopup } = $props()

  let { categories, feed } = popup
</script>

<Popup id={popup.id} reading={$feed ? $feed.reading : undefined}>
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
      <Stack row>
        <Radio
          label={$t.type}
          onchange={reading => {
            changeFeed($feed.id, { reading })
          }}
          value={$feed.reading}
          values={[
            ['slow', $t.slow],
            ['fast', $t.fast]
          ]}
          wide
        />
        <Select
          label={$t.category}
          onchange={async value => {
            if (value === 'new') {
              let title = prompt($t.categoryName)
              if (!title) return
              value = await addCategory({ title })
            }
            changeFeed($feed.id, { categoryId: value })
          }}
          value={$feed.categoryId}
          values={$categories}
        />
      </Stack>
    {/if}
  </Stack>
</Popup>
