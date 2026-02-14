<script lang="ts">
  import {
    busy,
    currentPage,
    isOutdatedClient,
    layoutType,
    notFound,
    popupsStatus,
    signOut,
    subscribeUntil,
    userId
  } from '@slowreader/core'

  import AboutPage from '../pages/about.svelte'
  import AddPage from '../pages/add.svelte'
  import BusyPage from '../pages/busy.svelte'
  import CloudPage from '../pages/cloud.svelte'
  import DownloadPage from '../pages/download.svelte'
  import ExportPage from '../pages/export.svelte'
  import FeedByCategoriesPage from '../pages/feeds-by-categories.svelte'
  import FeedsPage from '../pages/feeds/index.svelte'
  import ImportPage from '../pages/import.svelte'
  import InterfacePage from '../pages/interface.svelte'
  import NotFoundPage from '../pages/not-found.svelte'
  import OutdatedPage from '../pages/outdated.svelte'
  import SignupPage from '../pages/signup.svelte'
  import StartPage from '../pages/start.svelte'
  import FeedPopup from '../popups/feed.svelte'
  import LoadingPopup from '../popups/loading.svelte'
  import NotFoundPopup from '../popups/not-found.svelte'
  import PostPopup from '../popups/post.svelte'
  import RefreshPopup from '../popups/refresh.svelte'
  import Button from '../ui/button.svelte'
  import Navbar from '../ui/navbar/index.svelte'
  import PopupShadow from '../ui/popup-shadow.svelte'
  import ThinPage from '../ui/thin-page.svelte'

  // To have smooth app starting loader animation we are re-using loader in HTML
  // while app is initializing, but need to render new one later
  let globalLoader = $state(true)
  subscribeUntil(busy, value => {
    if (!value) {
      globalLoader = false
      document.querySelector('#loader')?.remove()
      return true
    }
  })

  let pageLoading = $derived($currentPage.loading)
  let pageHideMenu = $derived($currentPage.hideMenu)

  let popup = $derived($popupsStatus.last)
  let popupLoading = $derived($popupsStatus.loading)
  let popupNotFound = $derived($popupsStatus.notFound)
  let popupOther = $derived($popupsStatus.other)
</script>

{#if $notFound}
  <NotFoundPage />
{:else if $busy || $pageLoading}
  {#if !globalLoader}
    <BusyPage />
  {/if}
{:else if $isOutdatedClient || $currentPage.route === 'outdated'}
  <OutdatedPage />
{:else if $currentPage.route === 'notFound'}
  <NotFoundPage />
{:else if $currentPage.route === 'fast'}
  <FeedsPage page={$currentPage} />
{:else if $currentPage.route === 'slow'}
  <FeedsPage page={$currentPage} />
{:else if $currentPage.route === 'add'}
  <AddPage page={$currentPage} />
{:else if $currentPage.route === 'feedsByCategories'}
  <FeedByCategoriesPage page={$currentPage} />
{:else if $currentPage.route === 'about'}
  <AboutPage page={$currentPage} />
{:else if $currentPage.route === 'cloud'}
  <CloudPage page={$currentPage} />
{:else if $currentPage.route === 'start'}
  <StartPage page={$currentPage} />
{:else if $currentPage.route === 'signup'}
  <SignupPage page={$currentPage} />
{:else if $currentPage.route === 'interface'}
  <InterfacePage />
{:else if $currentPage.route === 'download'}
  <DownloadPage />
{:else if $currentPage.route === 'export'}
  <ExportPage page={$currentPage} />
{:else if $currentPage.route === 'import'}
  <ImportPage page={$currentPage} />
{:else}
  <ThinPage title={$currentPage.route}>
    {$currentPage.route}
    <Button onclick={signOut}>Exit</Button>
  </ThinPage>
{/if}

{#if !$busy && $userId && !$pageHideMenu}
  <Navbar />
{/if}

{#if $layoutType !== 'mobile'}
  {#each popupOther as i, index (i.uniqueId)}
    <PopupShadow index={popupOther.length - index} />
  {/each}
{/if}
{#if popup}
  {#if popupLoading}
    <LoadingPopup {popup} />
  {:else if popupNotFound}
    <NotFoundPopup {popup} />
  {:else if popup.name === 'post'}
    <PostPopup {popup} />
  {:else if popup.name === 'feed'}
    <FeedPopup {popup} />
  {:else if popup.name === 'refresh'}
    <RefreshPopup />
  {/if}
{/if}
