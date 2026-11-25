<script lang="ts">
  import { mdiChevronDown, mdiHistory, mdiTrashCanOutline } from '@mdi/js'
  import {
    getPopupId,
    getPostPopupParam,
    getPostTitle,
    type HistoryPage,
    isOpenedPost,
    openedPost,
    organizeMessages,
    historyMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Links from '../ui/links.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import Stack from '../ui/stack.svelte'

  let { page }: { page: HistoryPage } = $props()
  let { clearing, hasMore, posts } = $derived(page)

  let links = $derived(
    $posts.map(post => {
      let param = getPostPopupParam(post, true)
      return {
        controls: getPopupId('post', param),
        hint: post.feedTitle ?? undefined,
        href: getPopupHash(undefined, 'post', param),
        id: post.id,
        item: post,
        reading: post.reading
      }
    })
  )
</script>

<PopupablePage padding title={[$t.title, $organizeMessages.feedsTitle]}>
  {#if $posts.length === 0}
    <Stack align="center">
      <PageIcon path={mdiHistory}>{$t.empty}</PageIcon>
    </Stack>
  {:else}
    <Stack>
      <Links
        anchor="post"
        current={$posts.find(post => isOpenedPost($openedPost, post))?.id}
        {links}
      >
        {#snippet item(post)}
          {getPostTitle(post)}
        {/snippet}
      </Links>
      {#if $hasMore}
        <Button icon={mdiChevronDown} onclick={page.showMore} size="wide">
          {$organizeMessages.morePosts}
        </Button>
      {/if}
      <Stack align="center">
        <Button
          color="dangerous"
          icon={mdiTrashCanOutline}
          loader={$clearing}
          onclick={page.clear}
          variant="plain"
        >
          {$t.clear}
        </Button>
      </Stack>
    </Stack>
  {/if}
</PopupablePage>
