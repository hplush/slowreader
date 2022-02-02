<script lang="ts">
  import { isGuestRoute } from '@slowreader/core'

  import { router } from '../stores/router'
  import StartPage from '../pages/start.svelte'
  import AddPage from '../pages/add.svelte'
  import AddingPage from '../pages/adding.svelte'
  import Navbar from '../ui/navbar/index.svelte'
</script>

{#if !isGuestRoute($router)}
  <Navbar />
{/if}

{#if $router.route === 'start'}
  <StartPage />
{:else if $router.route === 'add'}
  <AddPage />
{:else if $router.route === 'adding'}
  <AddingPage url={$router.params.url} />
{/if}
