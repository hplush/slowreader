<script lang="ts">
  import { isGuestRoute, notFound, router, starting } from '@slowreader/core'

  import AboutPage from '../pages/about.svelte'
  import DownloadPage from '../pages/download.svelte'
  import InterfacePage from '../pages/interface.svelte'
  import NotFoundPage from '../pages/not-found.svelte'
  import OrganizeFeedPage from '../pages/organize/feed.svelte'
  import OrganizePage from '../pages/organize/index.svelte'
  import PreviewPage from '../pages/preview.svelte'
  import ProfilePage from '../pages/profile.svelte'
  import RefreshPage from '../pages/refresh.svelte'
  import StartPage from '../pages/start.svelte'
  import StartingPage from '../pages/starting.svelte'
  import WelcomePage from '../pages/welcome.svelte'
  import UiNavbar from '../ui/navbar/index.svelte'
</script>

{#if $starting}
  <StartingPage />
{:else}
  {#if $notFound || $router.route === 'notFound'}
    <NotFoundPage />
  {:else if $router.route === 'start'}
    <StartPage />
  {:else if $router.route === 'preview' || $router.route === 'add'}
    <PreviewPage url={$router.route === 'preview' ? $router.params.url : ''} />
  {:else if $router.route === 'feeds'}
    <OrganizePage />
  {:else if $router.route === 'feed'}
    <OrganizeFeedPage feedId={$router.params.id} />
  {:else if $router.route === 'interface'}
    <InterfacePage />
  {:else if $router.route === 'download'}
    <DownloadPage />
  {:else if $router.route === 'profile'}
    <ProfilePage />
  {:else if $router.route === 'welcome'}
    <WelcomePage />
  {:else if $router.route === 'refresh'}
    <RefreshPage />
  {:else if $router.route === 'about'}
    <AboutPage />
  {/if}
  {#if !isGuestRoute($router)}
    <UiNavbar />
  {/if}
{/if}
