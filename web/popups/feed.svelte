<script lang="ts">
  import {
    mdiAccount,
    mdiAlertCircleOutline,
    mdiChevronDown,
    mdiClockOutline,
    mdiCursorDefaultClick,
    mdiCursorDefaultClickOutline,
    mdiFire,
    mdiFood,
    mdiFormatListChecks,
    mdiHandHeartOutline,
    mdiOpenInNew,
    mdiPageLayoutHeaderFooter,
    mdiPlusCircleOutline,
    mdiSleep,
    mdiTextBoxOutline,
    mdiThumbDown,
    mdiThumbDownOutline,
    mdiThumbUp,
    mdiThumbUpOutline,
    mdiTrashCanOutline
  } from '@mdi/js'
  import {
    addMessages as add,
    errorToMessage,
    type FeedPopup,
    getFeedStatsBar,
    getPopupId,
    hasPersonAvatar,
    isAccountService,
    type PostsListValue,
    organizeMessages as t,
    toPreviewPost
  } from '@slowreader/core'

  import { autoplayOnlyInside } from '../lib/media.ts'
  import Announce from '../ui/announce.svelte'
  import Button from '../ui/button.svelte'
  import CategorySelect from '../ui/category-select.svelte'
  import FeedAvatar from '../ui/feed-avatar.svelte'
  import FeedStats from '../ui/feed-stats.svelte'
  import Feed from '../ui/feed/index.svelte'
  import Input from '../ui/input.svelte'
  import Label from '../ui/label.svelte'
  import Loader from '../ui/loader.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import PostReactions from '../ui/post/reactions.svelte'
  import Radio from '../ui/radio.svelte'
  import Select from '../ui/select.svelte'
  import SpaceLoader from '../ui/space-loader.svelte'
  import Stack from '../ui/stack.svelte'
  import Status from '../ui/status.svelte'
  import Switch from '../ui/switch.svelte'
  import Tabs from '../ui/tabs.svelte'

  let { popup }: { popup: FeedPopup } = $props()

  let {
    accountError,
    activity,
    avatar,
    categories,
    deleting,
    dislikedPosts,
    extract,
    extractProgress,
    extractStatus,
    feed,
    followedBy,
    likedPosts,
    openedPosts,
    owner,
    posts,
    previews,
    reactions,
    reader,
    reading,
    site,
    stats,
    userPostUrl
  } = $derived(popup)

  let subscribed = $derived($feed ?? $followedBy)

  let chosen = $state<'disliked' | 'liked' | 'opened' | 'recent'>('recent')
  // The switch disappears on unfollow
  let list = $derived($feed ? chosen : 'recent')
  // Posts are loaded from the service only when user opens their tab
  let cards = $derived.by(() => {
    if (list === 'liked') return $likedPosts
    if (list === 'disliked') return $dislikedPosts
    if (list === 'opened') return $openedPosts
  })

  let extractAnnounce = $derived.by(() => {
    if ($extractStatus === 'checking') return $t.extractChecking
    if ($extractStatus === 'downloading') return $t.extractDownloading
    if ($extractStatus === 'blocked') return $t.extractBlocked
    if ($extractStatus === 'enabled') return $t.extractDonate
    return ''
  })
</script>

{#snippet loading(value: PostsListValue, next: () => void)}
  {#if value.isLoading && value.list.length === 0}
    <Loader track="feed-popup-posts" />
  {:else}
    {#if value.error && !value.isLoading}
      <Note icon={mdiAlertCircleOutline} variant="dangerous">
        {errorToMessage(value.error)}
      </Note>
    {/if}
    {#if value.hasNext}
      <Button
        icon={mdiChevronDown}
        loader={value.isLoading}
        onclick={next}
        size="wide"
      >
        {$t.morePosts}
      </Button>
    {/if}
  {/if}
{/snippet}

{#snippet recent()}
  <Stack gap="s">
    {#if $previews.length > 0}
      <Feed
        feedUrl={popup.param}
        highlight={false}
        posts={$previews}
        userPostUrl={$userPostUrl}
      />
    {/if}
    {@render loading($posts, posts.next)}
  </Stack>
{/snippet}

<Popup
  id={getPopupId(popup.name, popup.param)}
  {@attach autoplayOnlyInside}
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
        {$t.follow}
      </Button>
    {:else}
      <Button
        color="dangerous"
        icon={mdiTrashCanOutline}
        loader={$deleting}
        onclick={() => {
          if (
            confirm(
              popup.finalUnfollow && $owner
                ? $t.deleteFinalConform
                : $t.deleteConform
            )
          ) {
            popup.remove()
          }
        }}
      >
        {$t.unfollow}
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
            ...(popup.noAnonymous
              ? []
              : [['', $t.anonymous] as [string, string]]),
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
        {:else if isAccountService(popup.loader) && !popup.noAnonymous}
          <Status label={$t.account}>{$t.anonymous}</Status>
        {/if}
      {/if}
      {#if $reader}
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
      {/if}
      {#if $feed && popup.canExtract}
        <Stack gap="xs">
          <Switch icon={mdiTextBoxOutline} label={$t.extract} store={extract} />
          {#if $extractStatus === 'checking'}
            <SpaceLoader label={$t.extractChecking} track="robots-check">
              <Note icon={mdiHandHeartOutline} variant="warning">
                {$t.extractDonate}
              </Note>
            </SpaceLoader>
          {:else if $extractStatus === 'downloading'}
            <SpaceLoader
              label={$t.extractDownloading}
              track="extract-unread"
              value={$extractProgress}
            >
              <Note icon={mdiHandHeartOutline} variant="warning">
                {$t.extractDonate}
              </Note>
            </SpaceLoader>
          {:else if $extractStatus === 'blocked'}
            <Note icon={mdiAlertCircleOutline} variant="dangerous">
              {$t.extractBlocked}
            </Note>
          {:else if $extractStatus === 'enabled'}
            <Note icon={mdiHandHeartOutline} variant="warning">
              {$t.extractDonate}
            </Note>
          {/if}
          <Announce text={extractAnnounce} />
        </Stack>
      {/if}
    {/if}
    {#if $stats}
      <Stack gap="xs">
        <Label hint={$t.statsSeen(getFeedStatsBar($stats).total)} tag="h2">
          {$t.stats}
        </Label>
        <FeedStats activity={$activity} stats={$stats} variant="legend" />
      </Stack>
    {/if}
    {#if $feed}
      <Tabs
        label={$t.postsList}
        onchange={value => {
          chosen = value
        }}
        value={list}
        values={[
          ['recent', $t.recentPosts, mdiClockOutline],
          ['liked', $t.likedPosts, mdiThumbUp],
          ['opened', $t.openedPosts, mdiCursorDefaultClick],
          ['disliked', $t.dislikedPosts, mdiThumbDown]
        ]}
      >
        {#if list === 'recent'}
          {@render recent()}
        {:else if cards && $cards}
          <Stack gap="s">
            {#if $cards.list.length > 0}
              <Feed
                feedUrl={popup.param}
                highlight={false}
                posts={$cards.list.map(i => toPreviewPost(i, popup.loader))}
                userPostUrl={$userPostUrl}
              />
            {/if}
            {@render loading($cards, cards.next)}
          </Stack>
        {:else if list === 'liked'}
          <PostReactions
            empty={$t.noLikedPosts}
            icon={mdiThumbUpOutline}
            list={$reactions.filter(i => i.type === 'liked')}
          />
        {:else if list === 'opened'}
          <PostReactions
            empty={$t.noOpenedPosts}
            icon={mdiCursorDefaultClickOutline}
            list={$reactions.filter(i => i.type === 'opened')}
          />
        {:else}
          <PostReactions
            empty={$t.noDislikedPosts}
            icon={mdiThumbDownOutline}
            list={$reactions.filter(i => i.type === 'disliked')}
          />
        {/if}
      </Tabs>
    {:else}
      <Stack gap="xs">
        <Label
          dangerous={$activity?.silence === 'twoYears'}
          hint={$activity?.hint}
          icon={$activity?.silence ? mdiSleep : undefined}
          tag="h2"
          warning={$activity?.warning}
        >
          {$t.feedPosts}
        </Label>
        {@render recent()}
      </Stack>
    {/if}
  </Stack>
</Popup>
