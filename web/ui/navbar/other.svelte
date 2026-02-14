<script lang="ts">
  import {
    mdiCloudSync,
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
  import NavbarCategory from './category.svelte'
  import NavbarItem from './item.svelte'

  const ICONS = {
    about: mdiInformationOutline,
    add: mdiPlusCircleOutline,
    cloud: mdiCloudSync,
    download: mdiFileDownloadOutline,
    export: mdiExport,
    feedsByCategories: mdiFileTree,
    import: mdiImport,
    interface: mdiPalette
  } satisfies Record<OtherName, string>
</script>

<NavbarCategory id="other-feeds" name={$t.feeds} closable={false}>
  {#each FEED_ROUTES as route (route)}
    <NavbarItem
      name={$t[route]}
      current={$router.route === route}
      href={getURL({ params: {}, route })}
      icon={ICONS[route]}
    />
  {/each}
</NavbarCategory>

<NavbarCategory id="other-settings" name={$t.settings} closable={false}>
  {#each SETTINGS_ROUTES as route (route)}
    <NavbarItem
      name={$t[route]}
      current={$router.route === route}
      href={getURL({ params: {}, route })}
      icon={ICONS[route]}
    />
  {/each}
</NavbarCategory>
