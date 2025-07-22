<script lang="ts">
  import {
    busy,
    currentPage,
    signOut,
    subscribeUntil,
    userId
  } from '@slowreader/core'

  import BusyPage from '../pages/busy.svelte'
  import NotFoundPage from '../pages/not-found.svelte'
  import SignupPage from '../pages/signup.svelte'
  import StartPage from '../pages/start.svelte'
  import Button from '../ui/button.svelte'
  import Navbar from '../ui/navbar.svelte'

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
</script>

{#if $busy || $pageLoading}
  {#if !globalLoader}
    <BusyPage />
  {/if}
{:else if $currentPage.route === 'notFound'}
  <NotFoundPage />
{:else if $currentPage.route === 'start'}
  <StartPage page={$currentPage} />
{:else if $currentPage.route === 'signup'}
  <SignupPage page={$currentPage} />
{:else}
  {$currentPage.route}
  <Button onclick={signOut}>Exit</Button>
{/if}

{#if !$busy && $userId && !$pageHideMenu}
  <Navbar />
{/if}
