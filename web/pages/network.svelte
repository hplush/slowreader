<script lang="ts">
  import {
    mdiAirplane,
    mdiCancel,
    mdiCheckAll,
    mdiDownloadOff,
    mdiFire,
    mdiGaugeLow,
    mdiLockOpenOutline,
    mdiPuzzle,
    mdiSignal,
    mdiWifi
  } from '@mdi/js'
  import {
    autoRefresh,
    cacheImages,
    cacheMediaReading,
    cacheVideos,
    canDetectNetwork,
    canDetectSaveData,
    extensionState,
    layoutType,
    type NetworkUse,
    requestMethod,
    saveData,
    saveDataMode,
    type SaveDataMode,
    settingsMessages,
    switchOf,
    networkMessages as t,
    usedRequestMethod
  } from '@slowreader/core'

  import { extensionStore, grantExtension } from '../main/extension.ts'
  import { clientUpdate } from '../stores/client-update.ts'
  import Button from '../ui/button.svelte'
  import InstallExtension from '../ui/install-extension.svelte'
  import Note from '../ui/note.svelte'
  import RadioList from '../ui/radio-list.svelte'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let wifi = canDetectNetwork()
  let system = canDetectSaveData()

  let saveDataValues = $derived(
    (
      [
        ['on', $t.saveDataOn],
        ['paid', $t.saveDataPaid],
        ['auto', $t.saveDataAuto],
        ['off', $t.saveDataOff]
      ] satisfies [SaveDataMode, string][]
    ).filter(([value]) => {
      return (system || value !== 'auto') && (wifi || value !== 'paid')
    })
  )

  let saveDataOn = switchOf(saveDataMode, 'on', 'off')
  let autoRefreshOn = switchOf(autoRefresh, 'always', 'never')

  function shownSaveDataMode(value: SaveDataMode): SaveDataMode {
    if (!system && value === 'auto') return 'off'
    if (!wifi && value === 'paid') return 'off'
    return value
  }

  let downloadValues = $derived(
    (
      [
        ['always', $t.cacheAlways, mdiSignal],
        ['free', $t.cacheFree, mdiWifi],
        ['never', $t.cacheNever, mdiGaugeLow]
      ] satisfies [NetworkUse, string, string][]
    ).filter(([value]) => wifi || value !== 'free')
  )

  function shownNetworkUse(value: NetworkUse): NetworkUse {
    return !wifi && value === 'free' ? 'always' : value
  }
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xxl">
    <Stack gap="m">
      <Title>{$t.requestsGroup}</Title>
      <RadioList
        label={$t.method}
        onchange={value => {
          requestMethod.set(value)
        }}
        value={$usedRequestMethod}
        values={[
          {
            description: $t.proxyDesc,
            name: $t.proxy,
            value: 'proxy'
          },
          {
            description: $t.extensionDesc,
            disabled: $extensionState !== 'granted',
            name: $t.extension,
            value: 'extension'
          }
        ]}
      />
      {#if $extensionState === 'restricted'}
        <Note icon={mdiPuzzle} variant="dangerous">
          {$t.restrictedExtension}
          <Button
            icon={mdiLockOpenOutline}
            onclick={grantExtension}
            size="wide"
          >
            {$t.allowExtension}
          </Button>
        </Note>
        <!-- Mobile browsers can not install the extension -->
      {:else if $extensionState === 'missing' && $layoutType !== 'mobile'}
        {#if $extensionStore}
          <InstallExtension text={$t.noExtension} />
        {:else}
          <Note icon={mdiPuzzle} variant="neutral">
            {$t.unsupportedBrowser}
          </Note>
        {/if}
      {/if}
    </Stack>
    <Stack gap="m">
      <Title>{$t.saveData}</Title>
      {#if saveDataValues.length > 2}
        <Radio
          label={$t.saveDataLabel}
          onchange={value => {
            saveDataMode.set(value)
          }}
          size="wide"
          value={shownSaveDataMode($saveDataMode)}
          values={saveDataValues}
        />
      {:else}
        <Switch label={$t.saveDataLabel} store={saveDataOn} />
      {/if}
    </Stack>
    <Stack gap="m">
      <Title>{$t.refreshGroup}</Title>
      {#if wifi}
        <Radio
          label={$t.autoRefresh}
          onchange={value => {
            autoRefresh.set(value)
          }}
          size="wide"
          value={$autoRefresh}
          values={downloadValues}
        />
      {:else}
        <Switch label={$t.autoRefresh} store={autoRefreshOn} />
      {/if}
    </Stack>
    <Stack gap="m">
      <Title>{$t.offlineGroup}</Title>
      {#if $clientUpdate || $saveData}
        <Stack gap="s">
          {#if $clientUpdate}
            <Note icon={mdiAirplane} variant="good">{$t.offline}</Note>
          {/if}
          {#if $saveData}
            <Note icon={mdiDownloadOff} variant="neutral">
              {$t.saveDataCache}
            </Note>
          {/if}
        </Stack>
      {/if}
      <Radio
        label={$t.cacheMediaReading}
        onchange={value => {
          cacheMediaReading.set(value)
        }}
        size="wide"
        value={$cacheMediaReading}
        values={[
          ['all', $t.cacheMediaReadingAll, mdiCheckAll],
          ['slow', $t.cacheMediaReadingSlow, mdiFire],
          ['none', $t.cacheMediaReadingNone, mdiCancel]
        ]}
      />
      {#if $cacheMediaReading !== 'none'}
        <Radio
          label={$t.cacheImages}
          onchange={value => {
            cacheImages.set(value)
          }}
          size="wide"
          value={shownNetworkUse($cacheImages)}
          values={downloadValues}
        />
        <Radio
          label={$t.cacheVideos}
          onchange={value => {
            cacheVideos.set(value)
          }}
          size="wide"
          value={shownNetworkUse($cacheVideos)}
          values={downloadValues}
        />
      {/if}
    </Stack>
  </Stack>
</ThinPage>
