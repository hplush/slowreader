<script lang="ts">
  import { mdiBookmarkOutline, mdiPlusCircleOutline } from '@mdi/js'
  import {
    type LaterPage,
    navbarMessages as navbar,
    router,
    laterMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Feed from '../ui/feed/index.svelte'
  import Loader from '../ui/loader.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: LaterPage } = $props()
  let { authors, loading, posts, userPostUrl } = $derived(page)
</script>

<PopupablePage title={[$t.title, $navbar.slow]}>
  <Stack height="stretch">
    <Stack align="center" justify="space-between" row>
      <Title>{$t.title}</Title>
      <Button
        href={getPopupHash($router, 'later', '1')}
        icon={mdiPlusCircleOutline}
      >
        {$t.add}
      </Button>
    </Stack>
    {#if $loading}
      <Stack height="stretch" justify="center">
        <Loader track="later" />
      </Stack>
    {:else if $posts.length === 0}
      <Stack align="center">
        <PageIcon path={mdiBookmarkOutline}>{$t.empty}</PageIcon>
      </Stack>
    {:else}
      <Feed
        authors={$authors}
        autoread
        posts={$posts}
        userPostUrl={$userPostUrl}
      />
    {/if}
  </Stack>
</PopupablePage>
