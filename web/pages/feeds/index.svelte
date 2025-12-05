<script lang="ts">
  import {
    mdiFormatListChecks,
    mdiPageLayoutHeaderFooter,
    mdiPlaylistEdit
  } from '@mdi/js'
  import { type FeedsPage, router, feedsMessages as t } from '@slowreader/core'

  import { getPopupHash } from '../../stores/url-router.ts'
  import Button from '../../ui/button.svelte'
  import Loader from '../../ui/loader.svelte'
  import PopupablePage from '../../ui/popupable-page.svelte'
  import Radio from '../../ui/radio.svelte'
  import Stack from '../../ui/stack.svelte'
  import FeedsEmptyPage from './empty.svelte'
  import FeedsFeedPage from './feed.svelte'
  import FeedsListPage from './list.svelte'
  import FeedsWelcomePage from './welcome.svelte'

  let { page }: { page: FeedsPage } = $props()
  let { feed, posts, postsLoading } = $derived(page)
</script>

<PopupablePage title={page.reading === 'slow' ? $t.slowTitle : $t.fastTitle}>
  <Stack height="stretch">
    <Stack justify="space-between" row>
      {#if $feed}
        <Button
          href={getPopupHash($router, 'feed', $feed.url)}
          icon={mdiPlaylistEdit}
        >
          {$t.feedPopup}
        </Button>
      {:else}
        <div></div>
      {/if}
      {#if $posts && $posts.name !== 'welcome' && $posts.name !== 'empty'}
        <Radio
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
        <Loader />
      </Stack>
    {:else if $posts.name === 'empty'}
      <FeedsEmptyPage reader={$posts} />
    {:else if $posts.name === 'welcome'}
      <FeedsWelcomePage reader={$posts} />
    {:else if $posts.name === 'feed'}
      <FeedsFeedPage reader={$posts} />
    {:else if $posts.name === 'list'}
      <FeedsListPage reader={$posts} />
    {/if}
  </Stack>
</PopupablePage>
