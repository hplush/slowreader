<script lang="ts">
  import { isGuestRoute, notFound, router, starting } from '@slowreader/core'

  import FeedsCategoriesFeed from '../pages/feeds/categories/feed.svelte'
  import FeedsCategories from '../pages/feeds/categories/index.svelte'
  import Preview from '../pages/feeds/preview.svelte'
  import NotFound from '../pages/not-found.svelte'
  import Refresh from '../pages/refresh.svelte'
  import SettingsAbout from '../pages/settings/about.svelte'
  import SettingsDownload from '../pages/settings/download.svelte'
  import SettingsInterface from '../pages/settings/interface.svelte'
  import SettingsProfile from '../pages/settings/profile.svelte'
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
    <FeedsCategories />
  {:else if $router.route === 'categoriesFeed'}
    <FeedsCategoriesFeed feedId={$router.params.id} />
  {:else if $router.route === 'interface'}
    <SettingsInterface />
  {:else if $router.route === 'download'}
    <SettingsDownload />
  {:else if $router.route === 'profile'}
    <SettingsProfile />
  {:else if $router.route === 'about'}
    <SettingsAbout />
  {:else if $router.route === 'welcome'}
    <Welcome />
  {:else if $router.route === 'refresh'}
    <Refresh />
  {/if}
  {#if !isGuestRoute($router)}
    <Navbar />
  {/if}
{/if}
