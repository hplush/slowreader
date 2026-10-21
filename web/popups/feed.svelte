<script lang="ts">
  import {
    mdiAlertCircleOutline,
    mdiChevronDown,
    mdiPlusCircleOutline,
    mdiTrashCanOutline
  } from '@mdi/js'
  import {
    changeFeed,
    collapseThreads,
    errorToMessage,
    type FeedPopup,
    getPopupId,
    organizeMessages as t,
    toPreviewPost
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import CategorySelect from '../ui/category-select.svelte'
  import FeedAvatar from '../ui/feed-avatar.svelte'
  import Feed from '../ui/feed/index.svelte'
  import Input from '../ui/input.svelte'
  import Label from '../ui/label.svelte'
  import Loader from '../ui/loader.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'

  let { popup }: { popup: FeedPopup } = $props()

  let { avatar, categories, feed, posts } = $derived(popup)
</script>

<Popup
  id={getPopupId(popup.name, popup.param)}
  reading={$feed ? $feed.reading : undefined}
>
  {#snippet header()}
    {#if !$feed}
      <Button
        anchor="add-feed"
        icon={mdiPlusCircleOutline}
        onclick={popup.add}
        variant="main"
      >
        {$t.addFeed}
      </Button>
    {:else}
      <Button
        icon={mdiTrashCanOutline}
        onclick={() => {
          if (confirm($t.deleteConform)) {
            popup.remove()
          }
        }}
        variant="secondary-dangerous"
      >
        {$t.deleteFeed}
      </Button>
    {/if}
  {/snippet}
  <Stack gap="l">
    <Stack align="end" gap="s" row>
      <FeedAvatar
        avatar={$avatar ?? $feed?.avatar}
        feedId={$feed?.id}
        size="large"
      />
      {#if $feed}
        <Input
          label={$t.title}
          onchange={title => {
            popup.rename(title)
          }}
          placeholder={$feed.originTitle ?? undefined}
          value={$feed.title}
        />
      {:else}
        <Output label={$t.title} value={popup.title} />
      {/if}
    </Stack>
    <Output label={$t.feedUrl} value={popup.param} />
    {#if $feed}
      <Stack row>
        <Radio
          label={$t.type}
          onchange={reading => {
            changeFeed($feed.id, { reading })
          }}
          size="wide"
          value={$feed.reading}
          values={[
            ['slow', $t.slow],
            ['fast', $t.fast]
          ]}
        />
        <CategorySelect
          onchange={categoryId => {
            changeFeed($feed.id, { categoryId })
          }}
          value={$feed.categoryId}
          values={$categories}
        />
      </Stack>
    {/if}
    <Stack gap="s">
      <Stack gap="xs">
        <Label tag="h2">{$t.feedPosts}</Label>
        {#if $posts.list.length > 0}
          <Feed
            feedUrl={popup.param}
            posts={collapseThreads($posts.list).map(toPreviewPost)}
          />
        {/if}
      </Stack>
      {#if $posts.isLoading}
        <Loader track="feed-popup-posts" />
      {:else}
        {#if $posts.error}
          <Note icon={mdiAlertCircleOutline} variant="dangerous">
            {errorToMessage($posts.error)}
          </Note>
        {/if}
        {#if $posts.hasNext}
          <Button icon={mdiChevronDown} onclick={posts.next} size="wide">
            {$t.morePosts}
          </Button>
        {/if}
      {/if}
    </Stack>
  </Stack>
</Popup>
