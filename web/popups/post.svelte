<script lang="ts">
  import {
    mdiEyeCheckOutline,
    mdiOpenInNew,
    mdiShareVariantOutline
  } from '@mdi/js'
  import {
    getPopupId,
    hasPersonAvatar,
    type PostPopup,
    router,
    postMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { canShare, shareUrl } from '../lib/share.ts'
  import { onNextVisibility } from '../lib/visitibility.ts'
  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import FeedLink from '../ui/feed-link.svelte'
  import Popup from '../ui/popup.svelte'
  import Post from '../ui/post/index.svelte'
  import PostThreadPart from '../ui/post/thread-part.svelte'
  import SmallLink from '../ui/small-link.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import Toggle from '../ui/toggle.svelte'

  let { popup }: { popup: PostPopup } = $props()

  let { feed, post, publishedAt, read, thread, userPostUrl } = $derived(popup)

  let url = $derived($userPostUrl($post))

  onMount(() => {
    if (popup.read) {
      onNextVisibility(() => {
        popup.read?.set(true)
      })
    }
  })
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  {#snippet header()}
    {#if popup.read}
      <Toggle
        icon={mdiEyeCheckOutline}
        label={$read ? $t.unread : $t.read}
        size="icon"
        store={popup.read}
      />
    {/if}
    {#if url && canShare()}
      <Button
        icon={mdiShareVariantOutline}
        onclick={() => {
          shareUrl(url)
        }}
        size="icon"
      >
        {$t.share}
      </Button>
    {/if}
    {#if url}
      <Button href={url} icon={mdiOpenInNew} size="icon" target="_blank">
        {$t.url}
      </Button>
    {/if}
  {/snippet}
  <Stack>
    <Stack justify="space-between" row width="stretch">
      {#if feed}
        <FeedLink
          avatar={$feed!.avatar}
          avatarRound={hasPersonAvatar($feed!.loader)}
          feedId={$feed!.id}
          href={getPopupHash($router, 'feed', $feed!.url)}
          title={$feed!.title}
          variant="secondary"
        />
      {:else}
        <div></div>
      {/if}
      <SmallLink href={url} target="_blank">
        {$publishedAt}
      </SmallLink>
    </Stack>
    <Stack gap="xxl">
      <Stack gap="s">
        <Post
          post={$post}
          repostHref={feed && getPopupHash($router, 'feed', $feed!.url)}
          userPostUrl={$userPostUrl}
        />
        {#each $thread as part (part.id)}
          <PostThreadPart
            afterFirst={part.afterFirstText}
            post={part}
            publishedAt={part.publishedAtText}
            userPostUrl={$userPostUrl}
          />
        {/each}
      </Stack>
      <Stack>
        {#if url}
          <Button
            href={url}
            icon={mdiOpenInNew}
            size="wide"
            target="_blank"
            variant="attention"
          >
            {$t.url}
          </Button>
        {/if}
        {#if popup.read}
          <Switch
            icon={mdiEyeCheckOutline}
            label={$t.readCheckbox}
            store={popup.read}
          />
        {/if}
      </Stack>
    </Stack>
  </Stack>
</Popup>
