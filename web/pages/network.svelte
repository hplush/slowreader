<script lang="ts">
  import {
    mdiAirplane,
    mdiCancel,
    mdiCheckAll,
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
    extensionState,
    layoutType,
    type NetworkUse,
    requestMethod,
    settingsMessages,
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
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let wifi = canDetectNetwork()

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
      <Title>{$t.refreshGroup}</Title>
      <Radio
        label={$t.autoRefresh}
        onchange={value => {
          autoRefresh.set(value)
        }}
        size="wide"
        value={shownNetworkUse($autoRefresh)}
        values={downloadValues}
      />
    </Stack>
    <Stack gap="m">
      <Title>{$t.offlineGroup}</Title>
      {#if $clientUpdate}
        <Note icon={mdiAirplane} variant="good">{$t.offline}</Note>
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
