<script lang="ts">
  import { getPopupId, getPostContent, type PostPopup } from '@slowreader/core'

  import FormattedText from '../ui/formatted-text.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { popup }: { popup: PostPopup } = $props()

  let { post } = popup
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  <Stack>
    {#if $post.title}
      <Title font="safe">
        <FormattedText html={$post.title} />
      </Title>
    {/if}
    <FormattedText html={getPostContent($post)} />
  </Stack>
</Popup>
