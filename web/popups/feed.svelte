<script lang="ts">
  import {
    mdiAccount,
    mdiAlertCircleOutline,
    mdiChevronDown,
    mdiFire,
    mdiFood,
    mdiOpenInNew,
    mdiPlusCircleOutline,
    mdiTrashCanOutline
  } from '@mdi/js'
  import {
    addMessages as add,
    errorToMessage,
    type FeedPopup,
    formatFrequency,
    getPopupId,
    hasPersonAvatar,
    isAccountService,
    isTooFrequent,
    organizeMessages as t
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
    deleting,
    feed,
    followedBy,
    frequency,
    owner,
    posts,
    previews,
    reading,
    site,
    userPostUrl
  } = $derived(popup)

  let subscribed = $derived($feed ?? $followedBy)
</script>

<Popup
  id={getPopupId(popup.name, popup.param)}
  reading={subscribed ? $reading : undefined}
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
        loader={$deleting}
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
    {#if $site}
      <Button href={$site} icon={mdiOpenInNew} size="icon" target="_blank">
        {$t.openWebsite}
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
      hint={$add[`${popup.loader}Loader`]}
      label={$t.feedUrl}
      value={popup.param}
    />
    {#if $accountError}
      <Note icon={mdiAlertCircleOutline} variant="dangerous">
        {$accountError}
      </Note>
    {/if}
    {#if subscribed}
      {#snippet accountSelect()}
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
      {/snippet}
      {#snippet typeRadio(
        values: ['account' | 'fast' | 'slow', string, string][]
      )}
        <Radio
          label={$t.type}
          onchange={value => {
            popup.change({ reading: value === 'account' ? null : value })
          }}
          size="wide"
          value={$feed?.reading ?? ($owner ? 'account' : 'fast')}
          {values}
        />
      {/snippet}
      {#if $owner}
        {@render typeRadio([
          ['account', $t.accountReading, mdiAccount],
          ['slow', $t.slow, mdiFire],
          ['fast', $t.fast, mdiFood]
        ])}
        <Stack row="if-fits">
          <CategorySelect
            onchange={categoryId => {
              popup.change({ categoryId: categoryId || null })
            }}
            value={$feed?.categoryId ?? ''}
            values={[['', $t.sameAsAccount], ...$categories]}
          />
          {@render accountSelect()}
        </Stack>
      {:else}
        <Stack row="if-fits">
          {@render typeRadio([
            ['slow', $t.slow, mdiFire],
            ['fast', $t.fast, mdiFood]
          ])}
          <CategorySelect
            onchange={categoryId => {
              popup.change({ categoryId })
            }}
            value={$feed?.categoryId ?? ''}
            values={$categories}
          />
        </Stack>
        {#if popup.accounts.length > 0}
          {@render accountSelect()}
        {:else if isAccountService(popup.loader)}
          <Status label={$t.account}>{$t.anonymous}</Status>
        {/if}
      {/if}
    {/if}
    <Stack gap="s">
      <Stack gap="xs">
        <Label
          hint={$frequency === undefined
            ? undefined
            : formatFrequency($t, $frequency)}
          tag="h2"
          warning={$frequency !== undefined && isTooFrequent($frequency)
            ? $t.tooFrequent
            : undefined}
        >
          {$t.feedPosts}
        </Label>
        {#if $previews.length > 0}
          <Feed
            feedUrl={popup.param}
            highlight={false}
            posts={$previews}
            userPostUrl={$userPostUrl}
          />
        {/if}
      </Stack>
      {#if $posts.isLoading && $posts.list.length === 0}
        <Loader track="feed-popup-posts" />
      {:else}
        {#if $posts.error && !$posts.isLoading}
          <Note icon={mdiAlertCircleOutline} variant="dangerous">
            {errorToMessage($posts.error)}
          </Note>
        {/if}
        {#if $posts.hasNext}
          <Button
            icon={mdiChevronDown}
            loader={$posts.isLoading}
            onclick={posts.next}
            size="wide"
          >
            {$t.morePosts}
          </Button>
        {/if}
      {/if}
    </Stack>
  </Stack>
</Popup>
