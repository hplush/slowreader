<script lang="ts">
  import { mdiCheckboxMarkedCircle, mdiRadioboxBlank } from '@mdi/js'
  import {
    getPopupId,
    getPostContent,
    type PostPopup,
    postMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import FormattedText from '../ui/formatted-text.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { popup }: { popup: PostPopup } = $props()

  let { post } = popup
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  {#snippet header()}
    {#if popup.read}
      {#if $post.read}
        <Button icon={mdiRadioboxBlank} onclick={popup.unread}>
          {$t.unread}
        </Button>
      {:else}
        <Button icon={mdiCheckboxMarkedCircle} onclick={popup.read}>
          {$t.read}
        </Button>
      {/if}
    {/if}
  {/snippet}
  <Stack>
    {#if $post.title}
      <Title font="safe">
        <FormattedText html={$post.title} />
      </Title>
    {/if}
    <FormattedText html={getPostContent($post)} />
  </Stack>
</Popup>
