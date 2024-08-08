<script lang="ts">
  import {
    mdiAccount,
    mdiExport,
    mdiFileDownloadOutline,
    mdiFileTree,
    mdiImport,
    mdiInformationOutline,
    mdiPalette,
    mdiPlusCircleOutline
  } from '@mdi/js'
  import { hasFeeds, router, navbarMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/router.ts'
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
/>

{#if $hasFeeds}
  <NavbarItem
    name={$t.feedsByCategory}
    current={$router.route === 'categories'}
    href={getURL('categories')}
    icon={mdiFileTree}
    secondary
  />

  <NavbarItem
    name={$t.export}
    current={$router.route === 'export'}
    href={getURL('export')}
    icon={mdiExport}
    secondary
  />
{/if}

<NavbarItem
  name={$t.import}
  current={$router.route === 'import'}
  href={getURL('import')}
  icon={mdiImport}
  secondary
/>

<NavbarCategory name={$t.settings} />

<NavbarItem
  name={$t.interface}
  current={$router.route === 'interface'}
  href={getURL('interface')}
  icon={mdiPalette}
  secondary
/>

<NavbarItem
  name={$t.download}
  current={$router.route === 'download'}
  href={getURL('download')}
  icon={mdiFileDownloadOutline}
  secondary
/>

<NavbarItem
  name={$t.profile}
  current={$router.route === 'profile'}
  href={getURL('profile')}
  icon={mdiAccount}
  secondary
/>

<NavbarItem
  name={$t.about}
  current={$router.route === 'about'}
  href={getURL('about')}
  icon={mdiInformationOutline}
  secondary
/>
