<script lang="ts">
  import { mdiRefresh, mdiStop } from '@mdi/js'
  import {
    errorToMessage,
    isRefreshing,
    refreshErrors,
    refreshPosts,
    refreshProgress,
    refreshStatistics,
    router,
    stopRefreshing,
    refreshMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import ErrorList from '../ui/error-list.svelte'
  import Label from '../ui/label.svelte'
  import Loader from '../ui/loader.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Popup from '../ui/popup.svelte'
  import PostsNumbers from '../ui/posts-numbers.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'
</script>

<Popup id="refresh">
  {#snippet header()}
    {#if $isRefreshing}
      <Button
        icon={mdiStop}
        onclick={stopRefreshing}
        variant="secondary-dangerous"
      >
        {$t.stop}
      </Button>
    {:else}
      <Button icon={mdiRefresh} onclick={refreshPosts}>
        {$t.start}
      </Button>
    {/if}
  {/snippet}
  {#if $refreshStatistics.totalFeeds === 0 && !$isRefreshing}
    <Stack align="center" gap="xl">
      <PageIcon path={mdiRefresh} />
    </Stack>
  {:else}
    <Stack align="center" gap="xxl">
      <Stack gap="s">
        <Label>
          {#if !$isRefreshing}
            {$t.checked({
              all: $refreshStatistics.processedFeeds
            })}
          {:else}
            {$t.count({
              all: $refreshStatistics.totalFeeds,
              done: $refreshStatistics.processedFeeds
            })}
          {/if}
        </Label>
        <Loader
          size="wide"
          value={$refreshStatistics.initializing ? undefined : $refreshProgress}
        />
      </Stack>
      <PostsNumbers
        fast={$refreshStatistics.foundFast}
        slow={$refreshStatistics.foundSlow}
      />
      {#if $refreshErrors.length > 0}
        <Stack>
          <Title>{$t.errors}</Title>
          <ErrorList
            list={$refreshErrors.map(item => ({
              errorText: errorToMessage(item.error),
              title: item.feed.title,
              url: getPopupHash($router, 'feed', item.feed.url)
            }))}
          />
        </Stack>
      {/if}
    </Stack>
  {/if}
</Popup>
