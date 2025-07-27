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
  import {
    FEED_ROUTES,
    type OtherName,
    router,
    SETTINGS_ROUTES,
    navbarMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import NavbarItem from './item.svelte'

  const ICONS = {
    about: mdiInformationOutline,
    add: mdiPlusCircleOutline,
    download: mdiFileDownloadOutline,
    export: mdiExport,
    feedsByCategories: mdiFileTree,
    import: mdiImport,
    interface: mdiPalette,
    profile: mdiAccount
  } satisfies Record<OtherName, string>
</script>

{#each FEED_ROUTES as route (route)}
  {#if route in ICONS}
    <NavbarItem
      name={$t[route]}
      current={$router.route === route}
      href={getURL({ params: {}, route })}
      icon={ICONS[route]}
      inSubmenu
    />
  {/if}
{/each}

{#each SETTINGS_ROUTES as route (route)}
  {#if route in ICONS}
    <NavbarItem
      name={$t[route]}
      current={$router.route === route}
      href={getURL({ params: {}, route })}
      icon={ICONS[route]}
      inSubmenu
    />
  {/if}
{/each}
