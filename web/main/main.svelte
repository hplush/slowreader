<script lang="ts">
  import { busy, isGuestRoute, notFound, router } from '@slowreader/core'

  import Busy from '../pages/busy.svelte'
  import Fast from '../pages/fast.svelte'
  import FeedsAdd from '../pages/feeds/add.svelte'
  import FeedsCategories from '../pages/feeds/categories.svelte'
  import FeedsExport from '../pages/feeds/export.svelte'
  import FeedsImport from '../pages/feeds/import.svelte'
  import NotFound from '../pages/not-found.svelte'
  import Refresh from '../pages/refresh.svelte'
  import SettingsAbout from '../pages/settings/about.svelte'
  import SettingsDownload from '../pages/settings/download.svelte'
  import SettingsInterface from '../pages/settings/interface.svelte'
  import SettingsProfile from '../pages/settings/profile.svelte'
  import Slow from '../pages/slow.svelte'
  import Start from '../pages/start.svelte'
  import Welcome from '../pages/welcome.svelte'
  import Navbar from '../ui/navbar/index.svelte'
</script>

{#if $busy}
  <Busy />
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
  {:else if $router.route === 'export'}
    <FeedsExport formatId={$router.params.format} />
  {:else if $router.route === 'import'}
    <FeedsImport />
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
