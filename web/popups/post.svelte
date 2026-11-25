<script lang="ts">
  import {
    mdiCircleOutline,
    mdiCursorDefaultClick,
    mdiEyeCheckOutline,
    mdiOpenInNew,
    mdiThumbDown,
    mdiThumbUp
  } from '@mdi/js'
  import {
    getPopupId,
    hasPersonAvatar,
    type PostPopup,
    router,
    setPostReaction,
    postMessages as t
  } from '@slowreader/core'
  import { onMount } from 'svelte'

  import { autoplayOnlyInside } from '../lib/media.ts'
  import { trackPostLinks } from '../lib/post-links.ts'
  import { onNextVisibility } from '../lib/visitibility.ts'
  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import FeedLink from '../ui/feed-link.svelte'
  import Popup from '../ui/popup.svelte'
  import Post from '../ui/post/index.svelte'
  import PostLikes from '../ui/post/likes.svelte'
  import PostShare from '../ui/post/share.svelte'
  import PostThreadPart from '../ui/post/thread-part.svelte'
  import Radio from '../ui/radio.svelte'
  import SmallLink from '../ui/small-link.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import Toggle from '../ui/toggle.svelte'

  let { popup }: { popup: PostPopup } = $props()

  let {
    feed,
    post,
    publishedAt,
    reacted,
    reaction,
    read,
    thread,
    userPostUrl
  } = $derived(popup)

  let url = $derived($userPostUrl($post))
  let liked = $derived(
    { dislike: false, like: true, none: undefined, open: undefined }[$reaction]
  )

  onMount(() => {
    if (popup.read) {
      onNextVisibility(() => {
        popup.read?.set(true)
      })
    }
  })
</script>

{#snippet date()}
  <SmallLink href={url} target="_blank">
    {$publishedAt}
  </SmallLink>
{/snippet}

<Popup
  id={getPopupId(popup.name, popup.param)}
  {@attach autoplayOnlyInside}
  {@attach trackPostLinks(reacted)}
>
  {#snippet header()}
    {#if reacted}
      <PostLikes {liked} post={reacted} />
    {/if}
    {#if popup.read}
      <Toggle
        icon={mdiEyeCheckOutline}
        label={$read ? $t.unread : $t.read}
        size="icon"
        store={popup.read}
      />
    {/if}
    {#if url}
      <PostShare post={reacted} {url} />
    {/if}
    {#if url}
      <Button href={url} icon={mdiOpenInNew} size="icon" target="_blank">
        {$t.url}
      </Button>
    {/if}
  {/snippet}
  <Stack>
    {#if !$post.repostedBy}
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
        {@render date()}
      </Stack>
    {/if}
    <Stack gap="xxl">
      <Stack gap="s">
        <Post
          aside={$post.repostedBy ? date : undefined}
          loader={popup.loader}
          post={$post}
          protect={(feed && $feed!.protected) ||
            ('protected' in $post && $post.protected)}
          repostHref={feed && getPopupHash($router, 'feed', $feed!.url)}
          userPostUrl={$userPostUrl}
        />
        {#each $thread as part (part.id)}
          <PostThreadPart
            afterFirst={part.afterFirstText}
            loader={popup.loader}
            post={part}
            publishedAt={part.publishedAtText}
            userPostUrl={$userPostUrl}
          />
        {/each}
      </Stack>
      <Stack gap="l">
        {#if url && !popup.whole}
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
        {#if reacted || popup.read}
          <Stack>
            {#if reacted}
              <Radio
                label={$t.reaction}
                onchange={value => {
                  setPostReaction(reacted, value)
                }}
                size="wide"
                value={$reaction}
                values={[
                  ['like', $t.like, mdiThumbUp],
                  ['open', $t.openReaction, mdiCursorDefaultClick],
                  ['none', $t.noReaction, mdiCircleOutline],
                  ['dislike', $t.dislike, mdiThumbDown]
                ]}
              />
            {/if}
            {#if popup.read}
              <Switch
                icon={mdiEyeCheckOutline}
                label={$t.readCheckbox}
                store={popup.read}
              />
            {/if}
          </Stack>
        {/if}
      </Stack>
    </Stack>
  </Stack>
</Popup>
