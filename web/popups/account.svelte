<script lang="ts">
  import { mdiAccount, mdiTrashCanOutline } from '@mdi/js'
  import {
    type AccountPopup,
    getPopupId,
    accountsMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import CategorySelect from '../ui/category-select.svelte'
  import FeedAvatar from '../ui/feed-avatar.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'

  let { popup }: { popup: AccountPopup } = $props()
  let { account, categories } = $derived(popup)
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  {#snippet header()}
    <Button
      icon={mdiTrashCanOutline}
      onclick={() => {
        if (confirm($t.deleteConfirm)) {
          popup.remove()
        }
      }}
      variant="secondary-dangerous"
    >
      {$t.deleteAccount}
    </Button>
  {/snippet}
  {#if $account.value}
    {@const row = $account.value}
    <Stack gap="l">
      <Stack align="end" gap="s" row>
        <FeedAvatar avatar={row.avatar} icon={mdiAccount} size="large" />
        <Output font="normal" label={$t.name} value={row.title} />
      </Stack>
      <Output label={$t.handle} value={row.handle} />
      <CategorySelect
        onchange={popup.changeCategory}
        value={row.categoryId}
        values={$categories}
      />
      <Switch label={$t.follow} note={$t.followNote} store={popup.follow} />
    </Stack>
  {/if}
</Popup>
