<script lang="ts">
  import { mdiAccount, mdiInformationOutline, mdiPalette } from '@mdi/js'
  import { router } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'

  import { getURL } from '../../stores/router.js'
  import UiNavbarItem from './item.svelte'
</script>

<UiNavbarItem
  current={$router.route === 'appearance'}
  href={getURL('appearance')}
  icon={mdiPalette}
  secondary
>
  {$t.appearance}
</UiNavbarItem>

<UiNavbarItem
  current={$router.route === 'profile'}
  href={getURL('profile')}
  icon={mdiAccount}
  secondary
>
  {$t.profile}
</UiNavbarItem>

<UiNavbarItem
  current={$router.route === 'about'}
  href={getURL('about')}
  icon={mdiInformationOutline}
  secondary
>
  {$t.about}
</UiNavbarItem>
