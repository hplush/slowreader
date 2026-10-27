<script lang="ts">
  import {
    mdiCheckboxMultipleMarkedOutline,
    mdiFormatListChecks,
    mdiPageLayoutHeaderFooter
  } from '@mdi/js'
  import {
    type FeedsPage,
    hasPersonAvatar,
    navbarMessages as navbar,
    router,
    feedsMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../../stores/url-router.ts'
  import Button from '../../ui/button.svelte'
  import FeedLink from '../../ui/feed-link.svelte'
  import Loader from '../../ui/loader.svelte'
  import NavbarFast from '../../ui/navbar/fast.svelte'
  import NavbarSlow from '../../ui/navbar/slow.svelte'
  import NextPagination from '../../ui/next-pagination.svelte'
  import NumberPagination from '../../ui/number-pagination.svelte'
  import PopupablePage from '../../ui/popupable-page.svelte'
  import Radio from '../../ui/radio.svelte'
  import Stack from '../../ui/stack.svelte'
  import ThinPage from '../../ui/thin-page.svelte'
  import FeedsEmptyPage from './empty.svelte'
  import FeedsFeedPage from './feed.svelte'
  import FeedsListPage from './list.svelte'
  import FeedsLockedPage from './locked.svelte'
  import FeedsWelcomePage from './welcome.svelte'

  let { page }: { page: FeedsPage } = $props()
  let { feed, locked, menu, posts, postsLoading } = $derived(page)
  let reader = $derived(
    $posts?.name === 'feed' || $posts?.name === 'list' ? $posts : undefined
  )
  let list = $derived(reader?.list)
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
</script>

{#if $menu}
  <ThinPage title={page.reading === 'slow' ? $navbar.slow : $navbar.fast}>
    {#if page.reading === 'slow'}
      <NavbarSlow />
    {:else}
      <NavbarFast />
    {/if}
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
      <Stack justify="space-between" row>
        {#if $feed}
          <FeedLink
            avatar={$feed.avatar}
            avatarRound={hasPersonAvatar($feed.loader)}
            feedId={$feed.id}
            href={getPopupHash($router, 'feed', $feed.url)}
            title={$feed.title}
          />
        {:else}
          <div></div>
        {/if}
        {#if $posts && $posts.name !== 'empty'}
          <Radio
            anchor="reader"
            label={$t.reader}
            labelless
            onchange={page.changeReader}
            size="icon"
            value={$posts.name}
            values={[
              ['feed', $t.feedReader, mdiPageLayoutHeaderFooter],
              ['list', $t.listReader, mdiFormatListChecks]
            ]}
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
        <FeedsFeedPage feedUrl={$feed?.url} reader={$posts} />
      {:else}
        <FeedsListPage reader={$posts} />
      {/if}
      {#if reader && nextPagination}
        <NextPagination
          loader={!!$readingPage}
          next={$hasNext ? $nextFrom : undefined}
          onread={reader.readPage}
          page={$pageNumber ?? 0}
          prev={$prevFrom}
        />
      {:else if reader && $pages}
        {#if $list?.some(post => !post.read)}
          <Stack align="center">
            <Button
              anchor="read-page"
              icon={mdiCheckboxMultipleMarkedOutline}
              loader={$readingPage}
              onclick={reader.readPage}
              size="pill"
            >
              {#if $pages.hasNext}
                {$t.readPageAndNext}
              {:else}
                {$t.readPage}
              {/if}
            </Button>
          </Stack>
        {/if}
        <NumberPagination pages={$pages} />
      {/if}
    </Stack>
  </PopupablePage>
{/if}
