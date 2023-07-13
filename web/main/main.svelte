<script lang="ts">
  import { isGuestRoute } from '@slowreader/core'

  import AddPage from '../pages/add.svelte'
  import StartPage from '../pages/start.svelte'
  import { router } from '../stores/router'
  import Navbar from '../ui/navbar/index.svelte'
</script>

{#if !isGuestRoute($router)}
  <Navbar />
{/if}

{#if $router.route === 'start'}
  <StartPage />
{:else if $router.route === 'add'}
  <AddPage />
{:else if $router.route === 'preview'}
  <AddPage url={$router.params.url} />
{/if}
