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
    customPostFont,
    i18nFormat,
    openWarnings,
    POST_FONTS,
    type PostFont,
    postFont,
    postLineHeight,
    settingsMessages,
    showSensitiveMedia,
    interfaceMessages as t,
    textSize,
    theme,
    useQuietCursor,
    useReducedMotion
  } from '@slowreader/core'

  import { hasInAppBrowser, openLinksInBrowser } from '../stores/links.ts'
  import { systemReducedMotion } from '../stores/media-queries.ts'
  import FontPreview from '../ui/font-preview.svelte'
  import FrozenPosition from '../ui/frozen-position.svelte'
  import Input from '../ui/input.svelte'
  import Radio from '../ui/radio.svelte'
  import Select from '../ui/select.svelte'
  import Slider from '../ui/slider.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let fontNames: Record<PostFont, string> = $derived({
    'atkinson': 'Atkinson Hyperlegible',
    'bitter': 'Bitter',
    'custom': $t.postFontCustom,
    'default': $t.postFontDefault,
    'inter': 'Inter',
    'lexend': 'Lexend',
    'literata': 'Literata',
    'merriweather': 'Merriweather',
    'noto-sans': 'Noto Sans',
    'noto-serif': 'Noto Serif',
    'opendyslexic': 'OpenDyslexic',
    'system': $t.postFontSystem
  })
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xxl">
    <Stack gap="m">
      <Title>{$t.fontGroup}</Title>
      <FrozenPosition>
        <Slider
          buttons={{
            decrease: $t.textSizeDecrease,
            increase: $t.textSizeIncrease
          }}
          label={$t.textSize}
          mark={100}
          max={200}
          min={80}
          oninput={value => {
            textSize.set(value)
          }}
          output={$i18nFormat.number($textSize / 100, { style: 'percent' })}
          step={10}
          value={$textSize}
        />
      </FrozenPosition>
      <Select
        label={$t.postFont}
        onchange={value => {
          postFont.set(value)
        }}
        value={$postFont}
        values={POST_FONTS.map(font => [font, fontNames[font]])}
      />
      {#if $postFont === 'custom'}
        <Input
          autocomplete="off"
          label={$t.postFontCustomName}
          oninput={value => {
            customPostFont.set(value)
          }}
          value={$customPostFont}
        />
      {/if}
      <Radio
        label={$t.postLineHeight}
        onchange={value => {
          postLineHeight.set(value)
        }}
        size="wide"
        value={$postLineHeight}
        values={[
          ['compact', $t.postLineHeightCompact],
          ['normal', $t.postLineHeightNormal],
          ['relaxed', $t.postLineHeightRelaxed]
        ]}
      />
      <FontPreview
        text={$t.postFontPreviewText}
        title={$t.postFontPreviewTitle}
      />
    </Stack>
    <Stack gap="m">
      <Title>{$t.applicationGroup}</Title>
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
      {#if $hasInAppBrowser}
        <Switch
          icon={mdiOpenInApp}
          label={$t.inAppBrowser}
          note={$t.inAppBrowserLimit}
          reverseStore={openLinksInBrowser}
        />
      {/if}
    </Stack>
    <Stack gap="m">
      <Title>{$t.postsGroup}</Title>
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
    </Stack>
  </Stack>
</ThinPage>
