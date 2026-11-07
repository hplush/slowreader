<script lang="ts">
  import {
    mdiAlertOutline,
    mdiEyeOutline,
    mdiShieldCheckOutline
  } from '@mdi/js'
  import {
    openWarnings,
    removeTrackers,
    settingsMessages,
    showSensitiveMedia,
    postsMessages as t
  } from '@slowreader/core'

  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import ThinPage from '../ui/thin-page.svelte'
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="m">
    <Switch
      icon={mdiAlertOutline}
      label={$t.openWarnings}
      store={openWarnings}
    />
    <Switch
      icon={mdiEyeOutline}
      label={$t.showSensitiveMedia}
      store={showSensitiveMedia}
    />
    <Switch
      icon={mdiShieldCheckOutline}
      label={$t.removeTrackers}
      store={removeTrackers}
    />
  </Stack>
</ThinPage>
