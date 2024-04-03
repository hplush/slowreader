<script lang="ts">
  import {
    mdiAccount,
    mdiFileDownloadOutline,
    mdiFileTree,
    mdiInformationOutline,
    mdiPalette,
    mdiPlusCircleOutline
  } from '@mdi/js'
  import { hasFeeds, router, navbarMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/router.js'
  import NavbarCategory from './category.svelte'
  import NavbarItem from './item.svelte'
</script>

<NavbarCategory name={$t.feeds} />

<NavbarItem
  name={$t.add}
  current={$router.route === 'add'}
  href={getURL('add')}
  icon={mdiPlusCircleOutline}
  secondary
  on:click
/>

{#if $hasFeeds}
  <NavbarItem
    name={$t.feedsByCategory}
    current={$router.route === 'categories'}
    href={getURL('categories')}
    icon={mdiFileTree}
    secondary
    on:click
  />
{/if}

<NavbarCategory name={$t.settings} />

<NavbarItem
  name={$t.interface}
  current={$router.route === 'interface'}
  href={getURL('interface')}
  icon={mdiPalette}
  secondary
  on:click
/>

<NavbarItem
  name={$t.download}
  current={$router.route === 'download'}
  href={getURL('download')}
  icon={mdiFileDownloadOutline}
  secondary
  on:click
/>

<NavbarItem
  name={$t.profile}
  current={$router.route === 'profile'}
  href={getURL('profile')}
  icon={mdiAccount}
  secondary
  on:click
/>

<NavbarItem
  name={$t.about}
  current={$router.route === 'about'}
  href={getURL('about')}
  icon={mdiInformationOutline}
  secondary
  on:click
/>
