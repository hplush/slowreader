<script lang="ts">
  import { mdiThemeLightDark, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js'
  import {
    settingsMessages as t,
    theme,
    useQuietCursor,
    useReducedMotion
  } from '@slowreader/core'

  import { systemReducedMotion } from '../stores/media-queries.ts'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
</script>

<ThinPage title={[$t.interfaceTitle, $t.commonTitle]}>
  <Stack gap="xl">
    <Title>{$t.applicationInterface}</Title>
    <Stack gap="m">
      <Radio
        label={$t.theme}
        store={theme}
        values={[
          ['light', $t.themeLight, mdiWeatherSunny],
          ['system', $t.themeSystem, mdiThemeLightDark],
          ['dark', $t.themeDark, mdiWeatherNight]
        ]}
        wide
      />
      <Switch label={$t.usePointer} reverseStore={useQuietCursor} />
      {#if $systemReducedMotion}
        <Switch disabled label={$t.systemDisabledAnimations} />
      {:else}
        <Switch label={$t.useAnimations} reverseStore={useReducedMotion} />
      {/if}
    </Stack>
  </Stack>
</ThinPage>
