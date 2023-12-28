<script lang="ts">
  import { isGuestRoute, notFound, router, starting } from '@slowreader/core'

  import About from '../pages/about.svelte'
  import Download from '../pages/download.svelte'
  import Interface from '../pages/interface.svelte'
  import NotFound from '../pages/not-found.svelte'
  import OrganizeFeed from '../pages/organize/feed.svelte'
  import Organize from '../pages/organize/index.svelte'
  import Preview from '../pages/preview.svelte'
  import Profile from '../pages/profile.svelte'
  import Refresh from '../pages/refresh.svelte'
  import Start from '../pages/start.svelte'
  import Starting from '../pages/starting.svelte'
  import Welcome from '../pages/welcome.svelte'
  import Navbar from '../ui/navbar/index.svelte'
</script>

{#if $starting}
  <Starting />
{:else}
  {#if $notFound || $router.route === 'notFound'}
    <NotFound />
  {:else if $router.route === 'start'}
    <Start />
  {:else if $router.route === 'preview' || $router.route === 'add'}
    <Preview url={$router.route === 'preview' ? $router.params.url : ''} />
  {:else if $router.route === 'categories'}
    <Organize />
  {:else if $router.route === 'categoriesFeed'}
    <OrganizeFeed feedId={$router.params.id} />
  {:else if $router.route === 'interface'}
    <Interface />
  {:else if $router.route === 'download'}
    <Download />
  {:else if $router.route === 'profile'}
    <Profile />
  {:else if $router.route === 'welcome'}
    <Welcome />
  {:else if $router.route === 'refresh'}
    <Refresh />
  {:else if $router.route === 'about'}
    <About />
  {/if}
  {#if !isGuestRoute($router)}
    <Navbar />
  {/if}
{/if}
