<script lang="ts">
  import {
    mdiAccount,
    mdiFileDownloadOutline,
    mdiInformationOutline,
    mdiPalette
  } from '@mdi/js'
  import { router } from '@slowreader/core'
  import { navbarMessages as t } from '@slowreader/core/messages'

  import { getURL } from '../../stores/router.js'
  import NavbarItem from './item.svelte'
</script>

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
