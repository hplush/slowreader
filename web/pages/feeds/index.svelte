<script lang="ts">
  import type { FeedsPage } from '@slowreader/core'

  import FeedsEmptyPage from './empty.svelte'
  import FeedsFeedPage from './feed.svelte'
  import FeedsListPage from './list.svelte'
  import FeedsOnboardingPage from './onboarding.svelte'

  let { page }: { page: FeedsPage } = $props()
  let { posts } = page
</script>

{#if $posts}
  {#if $posts.name === 'empty'}
    <FeedsEmptyPage reader={$posts} />
  {:else if $posts.name === 'onboarding'}
    <FeedsOnboardingPage reader={$posts} />
  {:else if $posts.name === 'feed'}
    <FeedsFeedPage reader={$posts} />
  {:else if $posts.name === 'list'}
    <FeedsListPage reader={$posts} />
  {/if}
{/if}
