<script lang="ts">
  import {
    mdiBookmarkOutline,
    mdiContentPaste,
    mdiPlusCircleOutline
  } from '@mdi/js'
  import {
    type LaterPage,
    navbarMessages as navbar,
    router,
    laterMessages as t
  } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Announce from '../ui/announce.svelte'
  import Button from '../ui/button.svelte'
  import Error from '../ui/error.svelte'
  import Feed from '../ui/feed/index.svelte'
  import Loader from '../ui/loader.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: LaterPage } = $props()
  let {
    added,
    adding,
    already,
    authors,
    failure,
    loading,
    pasteable,
    posts,
    userPostUrl
  } = $derived(page)
</script>

<PopupablePage title={[$t.title, $navbar.slow]}>
  <Stack height="stretch">
    <Stack align="center" justify="space-between" row>
      <Title>{$t.title}</Title>
      <Stack gap="xs" row width="auto">
        <Button
          href={getPopupHash($router, 'later', '1')}
          icon={mdiPlusCircleOutline}
          joined={$pasteable ? 'start' : undefined}
        >
          {$t.add}
        </Button>
        {#if $pasteable}
          <Button
            icon={mdiContentPaste}
            joined="end"
            loader={$adding}
            onclick={page.addFromClipboard}
          >
            {$t.paste}
          </Button>
        {/if}
      </Stack>
    </Stack>
    {#if $failure || $already}
      <Error align="end">{$failure ?? $t.already}</Error>
    {/if}
    <Announce text={$added ? $t.saved : ''} />
    {#if $loading}
      <Stack height="stretch" justify="center">
        <Loader track="later" />
      </Stack>
    {:else if $posts.length === 0}
      <Stack align="center">
        <PageIcon path={mdiBookmarkOutline}>{$t.empty}</PageIcon>
      </Stack>
    {:else}
      <Feed authors={$authors} posts={$posts} userPostUrl={$userPostUrl} />
    {/if}
  </Stack>
</PopupablePage>
