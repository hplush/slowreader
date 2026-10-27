<script lang="ts">
  import {
    busy,
    currentPage,
    layoutType,
    type LoadedPopup,
    pages,
    type Popup,
    type PopupName,
    popupsStatus,
    showCrash,
    signOut,
    userId
  } from '@slowreader/core'

  import AboutPage from '../pages/about.svelte'
  import AccountsPage from '../pages/accounts.svelte'
  import AddPage from '../pages/add.svelte'
  import BusyPage from '../pages/busy.svelte'
  import CloudPage from '../pages/cloud.svelte'
  import CoachPage from '../pages/coach.svelte'
  import ExportPage from '../pages/export.svelte'
  import FatalPage from '../pages/fatal.svelte'
  import FeedByCategoriesPage from '../pages/feeds-by-categories.svelte'
  import FeedsPage from '../pages/feeds/index.svelte'
  import ImportPage from '../pages/import.svelte'
  import InterfacePage from '../pages/interface.svelte'
  import MenuPage from '../pages/menu.svelte'
  import NetworkPage from '../pages/network.svelte'
  import ReloginPage from '../pages/relogin.svelte'
  import SignupPage from '../pages/sign-up.svelte'
  import StartPage from '../pages/start.svelte'
  import StoragePage from '../pages/storage.svelte'
  import WelcomePage from '../pages/welcome.svelte'
  import AccountPopup from '../popups/account.svelte'
  import ErrorPopup from '../popups/error.svelte'
  import FeedPopup from '../popups/feed.svelte'
  import LoadingPopup from '../popups/loading.svelte'
  import PasskeyPopup from '../popups/passkey.svelte'
  import PostPopup from '../popups/post.svelte'
  import RefreshPopup from '../popups/refresh.svelte'
  import SessionPopup from '../popups/session.svelte'
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
  let popupError = $derived($popupsStatus.error)
  let popupOther = $derived($popupsStatus.other)

  function isPopup<Name extends PopupName>(
    opened: LoadedPopup<Popup>,
    name: Name
  ): opened is LoadedPopup<Popup<Name>> {
    return opened.name === name
  }

  /**
   * Type check fails here if some popup is not rendered above.
   */
  function missedPopup(missed: never): never {
    throw new Error(`Unknown popup ${String(missed)}`)
  }
</script>

<svelte:boundary onerror={showCrash}>
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
  {:else if $currentPage.route === 'accounts'}
    <AccountsPage page={$currentPage} />
  {:else if $currentPage.route === 'cloud'}
    <CloudPage page={$currentPage} />
  {:else if $currentPage.route === 'coach'}
    <CoachPage page={$currentPage} />
  {:else if $currentPage.route === 'start'}
    <StartPage page={$currentPage} />
  {:else if $currentPage.route === 'signUp'}
    <SignupPage page={$currentPage} />
  {:else if $currentPage.route === 'interface'}
    <InterfacePage />
  {:else if $currentPage.route === 'menu'}
    <MenuPage />
  {:else if $currentPage.route === 'network'}
    <NetworkPage />
  {:else if $currentPage.route === 'storage'}
    <StoragePage page={$currentPage} />
  {:else if $currentPage.route === 'export'}
    <ExportPage page={$currentPage} />
  {:else if $currentPage.route === 'import'}
    <ImportPage page={$currentPage} />
  {:else if $currentPage.route === 'welcome'}
    <WelcomePage />
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
    {:else if popupNotFound || popupError}
      <ErrorPopup {popup} />
    {:else if isPopup(popup, 'post')}
      <PostPopup {popup} />
    {:else if isPopup(popup, 'feed')}
      <FeedPopup {popup} />
    {:else if isPopup(popup, 'refresh')}
      <RefreshPopup />
    {:else if isPopup(popup, 'passkey')}
      <PasskeyPopup {popup} />
    {:else if isPopup(popup, 'account')}
      <AccountPopup {popup} />
    {:else if isPopup(popup, 'session')}
      <SessionPopup {popup} />
    {:else}
      {missedPopup(popup)}
    {/if}
  {/if}

  {#snippet failed()}
    <FatalPage page={pages.fatal()} />
  {/snippet}
</svelte:boundary>
