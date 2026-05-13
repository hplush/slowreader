<script lang="ts">
  import { currentPage } from '@slowreader/core'

  import AboutPage from './about.svelte'
  import CloudPage from './cloud.svelte'
  import InterfacePage from './interface.svelte'
</script>

{#if $currentPage.route === 'about'}
  <AboutPage page={$currentPage} />
{:else if $currentPage.route === 'cloud'}
  <CloudPage page={$currentPage} />
{:else if $currentPage.route === 'interface'}
  <InterfacePage />
{/if}
