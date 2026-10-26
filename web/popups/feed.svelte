<script lang="ts">
  import {
    mdiAlertCircleOutline,
    mdiChevronDown,
    mdiPlusCircleOutline,
    mdiTrashCanOutline
  } from '@mdi/js'
  import {
    addMessages as add,
    collapseThreads,
    errorToMessage,
    type FeedPopup,
    getPopupId,
    hasPersonAvatar,
    isAccountService,
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
  import Select from '../ui/select.svelte'
  import Stack from '../ui/stack.svelte'
  import Status from '../ui/status.svelte'

  let { popup }: { popup: FeedPopup } = $props()

  let {
    accountError,
    avatar,
    categories,
    feed,
    followedBy,
    posts,
    userPostUrl
  } = $derived(popup)

  let subscribed = $derived($feed ?? $followedBy)
</script>

<Popup
  id={getPopupId(popup.name, popup.param)}
  reading={subscribed ? ($feed?.reading ?? 'fast') : undefined}
>
  {#snippet header()}
    {#if !subscribed}
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
        round={hasPersonAvatar(popup.loader)}
        size="large"
      />
      {#if subscribed}
        <Input
          label={$t.title}
          onchange={title => {
            popup.rename(title)
          }}
          placeholder={$feed ? ($feed.originTitle ?? undefined) : popup.title}
          value={$feed ? $feed.title : popup.title}
        />
      {:else}
        <Output font="normal" label={$t.title} value={popup.title} />
      {/if}
    </Stack>
    <Output
      label={$t.feedUrl({ type: $add[`${popup.loader}Loader`] })}
      value={popup.param}
    />
    {#if $accountError}
      <Note icon={mdiAlertCircleOutline} variant="dangerous">
        {$accountError}
      </Note>
    {/if}
    {#if subscribed}
      <Stack row>
        <Radio
          label={$t.type}
          onchange={reading => {
            popup.change({ reading })
          }}
          size="wide"
          value={$feed ? $feed.reading : 'fast'}
          values={[
            ['slow', $t.slow],
            ['fast', $t.fast]
          ]}
        />
        <CategorySelect
          onchange={categoryId => {
            popup.change({ categoryId })
          }}
          value={subscribed.categoryId}
          values={$categories}
        />
      </Stack>
      {#if popup.accounts.length > 0}
        <Select
          label={$t.account}
          onchange={accountId => {
            popup.changeAccount(accountId || undefined)
          }}
          value={$feed ? ($feed.accountId ?? '') : ($followedBy?.id ?? '')}
          values={[
            ['', $t.anonymous],
            ...popup.accounts.map(i => [i.id, i.handle] as [string, string])
          ]}
        />
      {:else if isAccountService(popup.loader)}
        <Status label={$t.account}>{$t.anonymous}</Status>
      {/if}
    {/if}
    <Stack gap="s">
      <Stack gap="xs">
        <Label tag="h2">{$t.feedPosts}</Label>
        {#if $posts.list.length > 0}
          <Feed
            feedUrl={popup.param}
            highlight={false}
            posts={collapseThreads($posts.list).map(toPreviewPost)}
            userPostUrl={$userPostUrl}
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
