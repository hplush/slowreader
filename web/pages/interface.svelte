<script lang="ts">
  import {
    mdiAlertOutline,
    mdiAnimationOutline,
    mdiButtonCursor,
    mdiEyeOutline,
    mdiOpenInApp,
    mdiThemeLightDark,
    mdiWeatherNight,
    mdiWeatherSunny
  } from '@mdi/js'
  import {
    openWarnings,
    settingsMessages,
    showSensitiveMedia,
    interfaceMessages as t,
    theme,
    useQuietCursor,
    useReducedMotion
  } from '@slowreader/core'

  import { hasInAppBrowser, openLinksInBrowser } from '../stores/links.ts'
  import { systemReducedMotion } from '../stores/media-queries.ts'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import ThinPage from '../ui/thin-page.svelte'
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    <Stack gap="m">
      <Radio
        label={$t.theme}
        onchange={value => {
          theme.set(value)
        }}
        size="wide"
        value={$theme}
        values={[
          ['light', $t.themeLight, mdiWeatherSunny],
          ['system', $t.themeSystem, mdiThemeLightDark],
          ['dark', $t.themeDark, mdiWeatherNight]
        ]}
      />
      <Switch
        icon={mdiButtonCursor}
        label={$t.usePointer}
        reverseStore={useQuietCursor}
      />
      {#if $systemReducedMotion}
        <Switch
          disabled
          icon={mdiAnimationOutline}
          label={$t.systemDisabledAnimations}
        />
      {:else}
        <Switch
          icon={mdiAnimationOutline}
          label={$t.useAnimations}
          reverseStore={useReducedMotion}
        />
      {/if}
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
      {#if $hasInAppBrowser}
        <Switch
          icon={mdiOpenInApp}
          label={$t.inAppBrowser}
          note={$t.inAppBrowserLimit}
          reverseStore={openLinksInBrowser}
        />
      {/if}
    </Stack>
  </Stack>
</ThinPage>
