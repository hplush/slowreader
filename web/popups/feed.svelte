<script lang="ts">
  import { mdiPlusCircleOutline, mdiTrashCanOutline } from '@mdi/js'
  import { type FeedPopup, organizeMessages as t } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'

  let { popup }: { popup: FeedPopup } = $props()

  let { feed } = popup
</script>

<Popup id={popup.id}>
  <Stack gap="xl">
    {#if !$feed}
      <Button
        icon={mdiPlusCircleOutline}
        onclick={popup.add}
        size="wide"
        variant="main"
      >
        {$t.addFeed}
      </Button>
    {/if}
    <Stack align="end" row>
      <Output label={$t.feedUrl} value={popup.param} />
      {#if $feed}
        <Button
          icon={mdiTrashCanOutline}
          onclick={popup.remove}
          variant="secondary-dangerous"
        >
          {$t.deleteFeed}
        </Button>
      {/if}
    </Stack>
  </Stack>
</Popup>
