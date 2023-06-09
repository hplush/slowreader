<script lang="ts">
  import { isGuestRoute } from '@slowreader/core'

  import AddPage from '../pages/add.svelte'
  import PreviewPage from '../pages/preview.svelte'
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
  <PreviewPage url={$router.params.url} />
{/if}
