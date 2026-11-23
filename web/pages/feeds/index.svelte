<script lang="ts" module>
  let menuScroll = { fast: 0, slow: 0 }
</script>

<script lang="ts">
  import { mdiCheckboxMultipleMarkedOutline } from '@mdi/js'
  import {
    type FeedsPage,
    hasPersonAvatar,
    navbarMessages as navbar,
    needUsefulReminder,
    openableMenu,
    organizeMessages as organize,
    router,
    feedsMessages as t
  } from '@slowreader/core'
  import type { Attachment } from 'svelte/attachments'
  import { on } from 'svelte/events'

  import { getPopupHash } from '../../stores/url-router.ts'
  import Button from '../../ui/button.svelte'
  import FeedLink from '../../ui/feed-link.svelte'
  import FeedStats from '../../ui/feed-stats.svelte'
  import Feed from '../../ui/feed/index.svelte'
  import Loader from '../../ui/loader.svelte'
  import NavbarFast from '../../ui/navbar/fast.svelte'
  import NavbarSlow from '../../ui/navbar/slow.svelte'
  import NavbarSync from '../../ui/navbar/sync.svelte'
  import NextPagination from '../../ui/next-pagination.svelte'
  import NumberPagination from '../../ui/number-pagination.svelte'
  import PopupablePage from '../../ui/popupable-page.svelte'
  import Stack from '../../ui/stack.svelte'
  import ThinPage from '../../ui/thin-page.svelte'
  import FeedsEmptyPage from './empty.svelte'
  import FeedsFeedPage from './feed.svelte'
  import FeedsListPage from './list.svelte'
  import FeedsLockedPage from './locked.svelte'
  import FeedsWelcomePage from './welcome.svelte'

  let { page }: { page: FeedsPage } = $props()
  let { category, feed, feedStats, locked, menu, posts, postsLoading } =
    $derived(page)
  let reader = $derived(
    $posts?.name === 'feed' || $posts?.name === 'list' ? $posts : undefined
  )
  let list = $derived(reader?.list)
  let dynamic = $derived(reader?.dynamic)
  let userPostUrl = $derived(reader?.userPostUrl)
  let readingPage = $derived(reader?.readingPage)
  let nextPagination = $derived(
    reader?.pagination.type === 'next' ? reader.pagination : undefined
  )
  let hasNext = $derived(nextPagination?.hasNext)
  let nextFrom = $derived(nextPagination?.nextFrom)
  let prevFrom = $derived(nextPagination?.prevFrom)
  let pageNumber = $derived(nextPagination?.page)
  let pages = $derived(
    reader?.pagination.type === 'number' ? reader.pagination.pages : undefined
  )

  function keepMenuScroll(reading: FeedsPage['reading']): Attachment {
    return element => {
      let main = element.closest('.main')
      if (!main) return
      main.scrollTop = menuScroll[reading]
      // Svelte removes the menu before teardown, so it can’t read the scroll
      let unbind = on(main, 'scroll', () => {
        menuScroll[reading] = main.scrollTop
      })
      return () => {
        unbind()
        main.scrollTop = 0
      }
    }
  }
</script>

{#if $menu}
  <ThinPage title={page.reading === 'slow' ? $navbar.slow : $navbar.fast}>
    <div {@attach keepMenuScroll(page.reading)}>
      {#if page.reading === 'slow'}
        <NavbarSlow />
      {:else}
        <NavbarFast />
      {/if}
    </div>
    <NavbarSync />
  </ThinPage>
{:else if $locked.locked}
  <ThinPage title={$navbar.fast}>
    <FeedsLockedPage {page} />
  </ThinPage>
{:else if $posts?.name === 'welcome'}
  <ThinPage title={page.reading === 'slow' ? $navbar.slow : $navbar.fast}>
    <FeedsWelcomePage reader={$posts} />
  </ThinPage>
{:else}
  <PopupablePage title={page.reading === 'slow' ? $navbar.slow : $navbar.fast}>
    <Stack height="stretch">
      <Stack align="center" justify="space-between" row>
        {#if $feed}
          <FeedLink
            anchor="edit-reader"
            avatar={$feed.avatar}
            avatarRound={hasPersonAvatar($feed.loader)}
            edit={$organize.editFeed}
            feedId={$feed.id}
            href={getPopupHash($router, 'feed', $feed.url)}
            title={$feed.title}
          />
        {:else if $category}
          <FeedLink
            anchor="edit-reader"
            edit={$organize.editCategory}
            href={getPopupHash($router, 'category', $category.id)}
            title={$category.title}
          />
        {:else}
          <div></div>
        {/if}
        {#if $feed && $feedStats}
          <FeedStats
            href={getPopupHash($router, 'feed', $feed.url)}
            stats={$feedStats}
            variant="stacked"
          />
        {/if}
      </Stack>
      {#if $postsLoading || !$posts}
        <Stack height="stretch" justify="center">
          <Loader track="posts" />
        </Stack>
      {:else if $posts.name === 'empty'}
        <FeedsEmptyPage reader={$posts} />
      {:else if $posts.name === 'feed'}
        <FeedsFeedPage
          autoread={page.reading === 'slow'}
          feedUrl={$feed?.url}
          reader={$posts}
        />
      {:else}
        <FeedsListPage reader={$posts} />
      {/if}
      {#if $dynamic?.length && $userPostUrl}
        <Feed posts={$dynamic} userPostUrl={$userPostUrl} />
      {/if}
      {#if reader && nextPagination}
        <NextPagination
          loader={!!$readingPage}
          next={$hasNext ? $nextFrom : undefined}
          onread={reader.readPage}
          page={$pageNumber ?? 0}
          prev={$prevFrom}
          useful={$openableMenu.slow && $needUsefulReminder}
        />
      {:else if reader && $pages}
        {#if $readingPage || $list?.some(post => !post.read)}
          <Button
            anchor="read-page"
            icon={mdiCheckboxMultipleMarkedOutline}
            loader={$readingPage}
            onclick={reader.readPage}
            size="wide"
            variant={$readingPage ? 'secondary' : 'attention'}
          >
            {#if $pages.hasNext}
              {$t.readPageAndNext}
            {:else}
              {$t.readPage}
            {/if}
          </Button>
        {/if}
        <NumberPagination pages={$pages} />
      {/if}
    </Stack>
  </PopupablePage>
{/if}
