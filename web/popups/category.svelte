<script lang="ts">
  import {
    mdiFormatListChecks,
    mdiPageLayoutHeaderFooter,
    mdiTrashCanOutline
  } from '@mdi/js'
  import {
    type CategoryPopup,
    commonMessages,
    getPopupId,
    organizeMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Input from '../ui/input.svelte'
  import Popup from '../ui/popup.svelte'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { popup }: { popup: CategoryPopup } = $props()

  let { category, reader } = $derived(popup)
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  {#snippet header()}
    {#if !popup.general}
      <Button
        color="dangerous"
        icon={mdiTrashCanOutline}
        onclick={() => {
          if (confirm($t.deleteCategoryConform)) {
            popup.remove()
          }
        }}
      >
        {$t.deleteCategory}
      </Button>
    {/if}
  {/snippet}
  <Stack gap="l">
    {#if popup.general}
      <Title>{$category.title}</Title>
    {:else}
      <Input
        label={$commonMessages.categoryName}
        onchange={popup.rename}
        placeholder={$category.title}
        value={$category.title}
      />
    {/if}
    <Stack row="half-if-fits">
      <Radio
        anchor="reader"
        label={$t.view}
        onchange={popup.changeReader}
        size="wide"
        value={$reader}
        values={[
          ['list', $t.viewList, mdiFormatListChecks],
          ['feed', $t.viewFeed, mdiPageLayoutHeaderFooter]
        ]}
      />
    </Stack>
  </Stack>
</Popup>
