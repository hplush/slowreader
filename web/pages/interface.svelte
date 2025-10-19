<script lang="ts">
  import { mdiThemeLightDark, mdiWeatherNight, mdiWeatherSunny } from '@mdi/js'
  import { settingsMessages as t, theme, useAnimations } from '@slowreader/core'

  import { systemReducedMotion } from '../stores/animations.ts'
  import { usePointer } from '../stores/pointer.ts'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
</script>

<ThinPage title={[$t.interfaceTitle, $t.commonTitle]}>
  <Stack gap="xl">
    <Title>{$t.applicationInterface}</Title>
    <Radio
      label={$t.theme}
      store={theme}
      values={[
        ['light', $t.themeLight, mdiWeatherSunny],
        ['system', $t.themeSystem, mdiThemeLightDark],
        ['dark', $t.themeDark, mdiWeatherNight]
      ]}
    />
    <label>
      <input type="checkbox" bind:checked={$usePointer} />
      {$t.useCursorPointer}
    </label>
    <label>
      {#if $systemReducedMotion}
        <input disabled type="checkbox" />
        {$t.systemDisableAnimations}
      {:else}
        <input type="checkbox" bind:checked={$useAnimations} />
        {$t.useAnimations}
      {/if}
    </label>
  </Stack>
</ThinPage>
