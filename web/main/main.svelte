<script lang="ts">
  import { isGuestRoute, router } from '@slowreader/core'

  import AddPage from '../pages/add.svelte'
  import FeedPage from '../pages/feed.svelte'
  import StartPage from '../pages/start.svelte'
  import Navbar from '../ui/navbar/index.svelte'
</script>

{#if !isGuestRoute($router)}
  <Navbar />
{/if}

{#if $router.route === 'start'}
  <StartPage />
{:else if $router.route === 'add'}
  <AddPage />
{:else if $router.route === 'preview'}
  <AddPage url={$router.params.url} />
{:else if $router.route === 'feeds'}
  <FeedPage />
{:else if $router.route === 'feed'}
  <FeedPage feedId={$router.params.id} />
{:else if $router.route === 'notFound'}
  404
{/if}
