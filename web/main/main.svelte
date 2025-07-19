<script lang="ts">
  import { busy, currentPage, signOut, subscribeUntil } from '@slowreader/core'

  import BusyPage from '../pages/busy.svelte'
  import SignupPage from '../pages/signup.svelte'
  import StartPage from '../pages/start.svelte'
  import Button from '../ui/button.svelte'

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
</script>

{#if $busy || $pageLoading}
  {#if !globalLoader}
    <BusyPage />
  {/if}
{:else if $currentPage.route === 'start'}
  <StartPage page={$currentPage} />
{:else if $currentPage.route === 'signup'}
  <SignupPage page={$currentPage} />
{:else}
  {$currentPage.route}
  <Button onclick={signOut}>Exit</Button>
{/if}
