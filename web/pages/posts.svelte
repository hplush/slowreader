<script lang="ts">
  import {
    mdiAlertOutline,
    mdiCancel,
    mdiDownloadOff,
    mdiEyeCheckOutline,
    mdiEyeOutline,
    mdiPlayCircleOutline,
    mdiShieldCheckOutline,
    mdiSignal,
    mdiWifi
  } from '@mdi/js'
  import {
    autoplayVideos,
    canDetectNetwork,
    markReadOn,
    openWarnings,
    removeTrackers,
    saveData,
    settingsMessages,
    showSensitiveMedia,
    switchOf,
    postsMessages as t
  } from '@slowreader/core'

  import Note from '../ui/note.svelte'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import ThinPage from '../ui/thin-page.svelte'

  let autoplayOn = switchOf(autoplayVideos, 'always', 'never')
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="m">
    <Radio
      label={$t.markReadOn}
      onchange={value => {
        markReadOn.set(value)
      }}
      size="wide"
      value={$markReadOn}
      values={[
        ['open', $t.markReadOnOpen, mdiEyeCheckOutline],
        ['none', $t.markReadOnNone, mdiCancel]
      ]}
    />
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
    {#if canDetectNetwork()}
      <Radio
        label={$t.autoplayVideos}
        onchange={value => {
          autoplayVideos.set(value)
        }}
        size="wide"
        value={$autoplayVideos}
        values={[
          ['always', $t.autoplayAlways, mdiSignal],
          ['free', $t.autoplayFree, mdiWifi],
          ['never', $t.autoplayNever, mdiCancel]
        ]}
      />
    {:else}
      <Switch
        icon={mdiPlayCircleOutline}
        label={$t.autoplayVideos}
        store={autoplayOn}
      />
    {/if}
    {#if $saveData && $autoplayVideos !== 'never'}
      <Note icon={mdiDownloadOff} variant="neutral">
        {$t.autoplaySaveData}
      </Note>
    {/if}
  </Stack>
</ThinPage>
