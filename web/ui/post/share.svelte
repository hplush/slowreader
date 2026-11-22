<script lang="ts">
  import { mdiCheck, mdiContentCopy, mdiShareVariantOutline } from '@mdi/js'
  import {
    commonMessages,
    postMessages as t,
    trackInterest
  } from '@slowreader/core'

  import { createClipboard } from '../../lib/clipboard.ts'
  import { canShare, shareUrl } from '../../lib/share.ts'
  import Announce from '../announce.svelte'
  import Button, { type ButtonVariant } from '../button.svelte'

  let {
    post,
    url,
    variant
  }: {
    post?: { feedId?: null | string; id: string }
    url: string
    variant?: ButtonVariant
  } = $props()

  let { copied, copy } = createClipboard()
</script>

{#if $canShare}
  <Button
    icon={mdiShareVariantOutline}
    onclick={() => {
      if (post) trackInterest(post, 'share')
      shareUrl(url)
    }}
    size="icon"
    {variant}
  >
    {$t.share}
  </Button>
{:else}
  <div class="post-share">
    <Button
      color={$copied ? 'success' : undefined}
      icon={$copied ? mdiCheck : mdiContentCopy}
      onclick={() => {
        if (post) trackInterest(post, 'share')
        copy(url)
      }}
      size="icon"
      {variant}
    >
      {$copied ? $commonMessages.copied : $t.copyUrl}
    </Button>
    <Announce text={$copied ? $commonMessages.copied : ''} />
  </div>
{/if}

<style lang="postcss">
  :global {
    .post-share {
      display: flex;
    }
  }
</style>
