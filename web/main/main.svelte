<script lang="ts">
  import { isGuestRoute, router } from '@slowreader/core'

  import OrganizeFeedPage from '../pages/organize/feed.svelte'
  import OrganizePage from '../pages/organize/index.svelte'
  import PreviewPage from '../pages/preview.svelte'
  import StartPage from '../pages/start.svelte'
  import Navbar from '../ui/navbar/index.svelte'
</script>

{#if !isGuestRoute($router)}
  <Navbar />
{/if}

{#if $router.route === 'start'}
  <StartPage />
{:else if $router.route === 'add'}
  <PreviewPage />
{:else if $router.route === 'preview'}
  <PreviewPage url={$router.params.url} />
{:else if $router.route === 'feeds'}
  <OrganizePage />
{:else if $router.route === 'feed'}
  <OrganizeFeedPage feedId={$router.params.id} />
{:else if $router.route === 'notFound'}
  404
{/if}
