<script lang="ts">
  import {
    mdiAccountMultiple,
    mdiCardTextOutline,
    mdiCloudSync,
    mdiDatabaseOutline,
    mdiExport,
    mdiFileTree,
    mdiHeadHeartOutline,
    mdiHistory,
    mdiImport,
    mdiInformationOutline,
    mdiPalette,
    mdiPlusCircleOutline,
    mdiRssOff,
    mdiWifi
  } from '@mdi/js'
  import {
    FEED_ROUTES,
    type OtherName,
    router,
    SETTINGS_ROUTES,
    syncStatusType,
    navbarMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import NavbarCategory from './category.svelte'
  import NavbarItem from './item.svelte'

  const ICONS = {
    about: mdiInformationOutline,
    accounts: mdiAccountMultiple,
    add: mdiPlusCircleOutline,
    categories: mdiFileTree,
    cloud: mdiCloudSync,
    coach: mdiHeadHeartOutline,
    deadFeeds: mdiRssOff,
    export: mdiExport,
    history: mdiHistory,
    import: mdiImport,
    interface: mdiPalette,
    network: mdiWifi,
    posts: mdiCardTextOutline,
    storage: mdiDatabaseOutline
  } satisfies Record<OtherName, string>
</script>

<NavbarCategory id="other-feeds" name={$t.feeds}>
  {#each FEED_ROUTES as route (route)}
    <NavbarItem
      name={$t[route]}
      current={$router.route === route}
      href={getURL({ params: {}, route })}
      icon={ICONS[route]}
    />
  {/each}
</NavbarCategory>

<NavbarCategory id="other-settings" name={$t.settings}>
  {#each SETTINGS_ROUTES as route (route)}
    <NavbarItem
      name={$t[route]}
      current={$router.route === route}
      dot={route === 'cloud' && $syncStatusType === 'error'}
      href={getURL({ params: {}, route })}
      icon={ICONS[route]}
    />
  {/each}
</NavbarCategory>
