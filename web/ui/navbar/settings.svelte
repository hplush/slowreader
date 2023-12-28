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
  current={$router.route === 'interface'}
  href={getURL('interface')}
  icon={mdiPalette}
  secondary
>
  {$t.interface}
</NavbarItem>

<NavbarItem
  current={$router.route === 'download'}
  href={getURL('download')}
  icon={mdiFileDownloadOutline}
  secondary
>
  {$t.download}
</NavbarItem>

<NavbarItem
  current={$router.route === 'profile'}
  href={getURL('profile')}
  icon={mdiAccount}
  secondary
>
  {$t.profile}
</NavbarItem>

<NavbarItem
  current={$router.route === 'about'}
  href={getURL('about')}
  icon={mdiInformationOutline}
  secondary
>
  {$t.about}
</NavbarItem>
