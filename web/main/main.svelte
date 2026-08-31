<script lang="ts">
  import {
    busy,
    currentPage,
    layoutType,
    popupsStatus,
    signOut,
    userId
  } from '@slowreader/core'

  import AboutPage from '../pages/about.svelte'
  import AddPage from '../pages/add.svelte'
  import BusyPage from '../pages/busy.svelte'
  import CloudPage from '../pages/cloud.svelte'
  import DownloadPage from '../pages/download.svelte'
  import ExportPage from '../pages/export.svelte'
  import FatalPage from '../pages/fatal.svelte'
  import FeedByCategoriesPage from '../pages/feeds-by-categories.svelte'
  import FeedsPage from '../pages/feeds/index.svelte'
  import ImportPage from '../pages/import.svelte'
  import InterfacePage from '../pages/interface.svelte'
  import ReloginPage from '../pages/relogin.svelte'
  import SignupPage from '../pages/sign-up.svelte'
  import StartPage from '../pages/start.svelte'
  import StoragePage from '../pages/storage.svelte'
  import FeedPopup from '../popups/feed.svelte'
  import LoadingPopup from '../popups/loading.svelte'
  import NotFoundPopup from '../popups/not-found.svelte'
  import PostPopup from '../popups/post.svelte'
  import RefreshPopup from '../popups/refresh.svelte'
  import Button from '../ui/button.svelte'
  import Navbar from '../ui/navbar/index.svelte'
  import PopupShadow from '../ui/popup-shadow.svelte'
  import ThinPage from '../ui/thin-page.svelte'

  let pageLoading = $derived($currentPage.loading)
  let pageHideBusy = $derived($currentPage.hideBusy)
  let pageHideMenu = $derived($currentPage.hideMenu)

  let showBusy = $derived($busy && !$pageHideBusy)

  let popup = $derived($popupsStatus.last)
  let popupLoading = $derived($popupsStatus.loading)
  let popupNotFound = $derived($popupsStatus.notFound)
  let popupOther = $derived($popupsStatus.other)
</script>

{#if $currentPage.route === 'fatal'}
  <FatalPage page={$currentPage} />
{:else if showBusy || $pageLoading}
  <BusyPage />
{:else if $currentPage.route === 'relogin'}
  <ReloginPage page={$currentPage} />
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
{:else if $currentPage.route === 'signUp'}
  <SignupPage page={$currentPage} />
{:else if $currentPage.route === 'interface'}
  <InterfacePage />
{:else if $currentPage.route === 'download'}
  <DownloadPage />
{:else if $currentPage.route === 'storage'}
  <StoragePage page={$currentPage} />
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

{#if !showBusy && $userId && !$pageHideMenu}
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
