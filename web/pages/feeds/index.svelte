<script lang="ts">
  import { type FeedsPage, feedsMessages as t } from '@slowreader/core'

  import PopupablePage from '../../ui/popupable-page.svelte'
  import FeedsEmptyPage from './empty.svelte'
  import FeedsFeedPage from './feed.svelte'
  import FeedsListPage from './list.svelte'
  import FeedsWelcomePage from './welcome.svelte'

  let { page }: { page: FeedsPage } = $props()
  let { posts } = page
</script>

<PopupablePage title={page.reading === 'slow' ? $t.slowTitle : $t.fastTitle}>
  {#if $posts}
    {#if $posts.name === 'empty'}
      <FeedsEmptyPage reader={$posts} />
    {:else if $posts.name === 'welcome'}
      <FeedsWelcomePage reader={$posts} />
    {:else if $posts.name === 'feed'}
      <FeedsFeedPage reader={$posts} />
    {:else if $posts.name === 'list'}
      <FeedsListPage reader={$posts} />
    {/if}
  {/if}
</PopupablePage>
