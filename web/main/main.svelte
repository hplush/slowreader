<script lang="ts">
  import { appLoading, isGuestRoute, notFound, router } from '@slowreader/core'

  import AboutPage from '../pages/about.svelte'
  import NotFoundPage from '../pages/not-found.svelte'
  import OrganizeFeedPage from '../pages/organize/feed.svelte'
  import OrganizePage from '../pages/organize/index.svelte'
  import PreviewPage from '../pages/preview.svelte'
  import ProfilePage from '../pages/profile.svelte'
  import RefreshPage from '../pages/refresh.svelte'
  import SettingsPage from '../pages/settings.svelte'
  import StartPage from '../pages/start.svelte'
  import WelcomePage from '../pages/welcome.svelte'
  import UiLoader from '../ui/loader.svelte'
  import UiNavbar from '../ui/navbar.svelte'
</script>

{#if $appLoading}
  <UiLoader />
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
  {:else if $router.route === 'settings'}
    <SettingsPage />
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
