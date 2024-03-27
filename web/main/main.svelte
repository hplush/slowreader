<script lang="ts">
  import { isGuestRoute, notFound, router, starting } from '@slowreader/core'
  import { actualizeThemeColor } from './helpers.js'

  import Fast from '../pages/fast.svelte'
  import FeedsAdd from '../pages/feeds/add.svelte'
  import FeedsCategories from '../pages/feeds/categories.svelte'
  import NotFound from '../pages/not-found.svelte'
  import Refresh from '../pages/refresh.svelte'
  import SettingsAbout from '../pages/settings/about.svelte'
  import SettingsDownload from '../pages/settings/download.svelte'
  import SettingsInterface from '../pages/settings/interface.svelte'
  import SettingsProfile from '../pages/settings/profile.svelte'
  import Slow from '../pages/slow.svelte'
  import Start from '../pages/start.svelte'
  import Starting from '../pages/starting.svelte'
  import Welcome from '../pages/welcome.svelte'
  import Navbar from '../ui/navbar/index.svelte'

  actualizeThemeColor()
</script>

{#if $starting}
  <Starting />
{:else}
  {#if $notFound || $router.route === 'notFound'}
    <NotFound />
  {:else if $router.route === 'start'}
    <Start />
  {:else if $router.route === 'fast'}
    <Fast />
  {:else if $router.route === 'slow'}
    <Slow />
  {:else if $router.route === 'add'}
    <FeedsAdd />
  {:else if $router.route === 'categories'}
    <FeedsCategories feedId={$router.params.feed} />
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
