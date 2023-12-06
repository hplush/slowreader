<script lang="ts">
  import { appLoading, isGuestRoute, notFound, router } from '@slowreader/core'

  import AboutPage from '../pages/about.svelte'
  import InterfacePage from '../pages/interface.svelte'
  import LoadPage from '../pages/load.svelte'
  import LoadingPage from '../pages/loading.svelte'
  import NotFoundPage from '../pages/not-found.svelte'
  import OrganizeFeedPage from '../pages/organize/feed.svelte'
  import OrganizePage from '../pages/organize/index.svelte'
  import PreviewPage from '../pages/preview.svelte'
  import ProfilePage from '../pages/profile.svelte'
  import RefreshPage from '../pages/refresh.svelte'
  import StartPage from '../pages/start.svelte'
  import WelcomePage from '../pages/welcome.svelte'
  import UiNavbar from '../ui/navbar/index.svelte'
</script>

{#if $appLoading}
  <LoadingPage />
{:else}
  {#if !isGuestRoute($router)}
    <UiNavbar />
  {/if}

  {#if $notFound || $router.route === 'notFound'}
    <NotFoundPage />
  {:else if $router.route === 'start'}
    <StartPage />
  {:else if $router.route === 'add'}
    <PreviewPage />
  {:else if $router.route === 'preview'}
    <PreviewPage url={$router.params.url} />
  {:else if $router.route === 'feeds'}
    <OrganizePage />
  {:else if $router.route === 'feed'}
    <OrganizeFeedPage feedId={$router.params.id} />
  {:else if $router.route === 'interface'}
    <InterfacePage />
  {:else if $router.route === 'load'}
    <LoadPage />
  {:else if $router.route === 'profile'}
    <ProfilePage />
  {:else if $router.route === 'welcome'}
    <WelcomePage />
  {:else if $router.route === 'refresh'}
    <RefreshPage />
  {:else if $router.route === 'about'}
    <AboutPage />
  {/if}
{/if}
