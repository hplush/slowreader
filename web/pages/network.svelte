<script lang="ts">
  import {
    mdiCloudOffOutline,
    mdiGaugeLow,
    mdiLockOpenOutline,
    mdiPlusCircleOutline,
    mdiPuzzle,
    mdiRefresh,
    mdiSignal,
    mdiWifi
  } from '@mdi/js'
  import {
    cacheImages,
    cacheVideos,
    canDetectNetwork,
    extensionState,
    layoutType,
    type MediaDownload,
    requestMethod,
    settingsMessages,
    networkMessages as t
  } from '@slowreader/core'

  import {
    extensionStore,
    grantExtension,
    installingExtension
  } from '../main/extension.ts'
  import { clientUpdate } from '../stores/client-update.ts'
  import { usedRequestMethod } from '../stores/request-method.ts'
  import Button from '../ui/button.svelte'
  import Label from '../ui/label.svelte'
  import Note from '../ui/note.svelte'
  import RadioList from '../ui/radio-list.svelte'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'

  let wifi = canDetectNetwork()

  let downloadValues = $derived(
    (
      [
        ['always', $t.cacheAlways, mdiSignal],
        ['free', $t.cacheFree, mdiWifi],
        ['never', $t.cacheNever, mdiGaugeLow]
      ] satisfies [MediaDownload, string, string][]
    ).filter(([value]) => wifi || value !== 'free')
  )

  function shownDownload(value: MediaDownload): MediaDownload {
    return !wifi && value === 'free' ? 'always' : value
  }
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    <Stack gap="m">
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
        <Note
          icon={$installingExtension ? mdiRefresh : mdiPuzzle}
          variant={$installingExtension ? 'warning' : 'good'}
        >
          {$installingExtension ? $t.installedExtension : $t.noExtension}
          <Stack align="center" gap="s">
            {#if $installingExtension}
              <Button
                icon={mdiRefresh}
                onclick={() => {
                  location.reload()
                }}
                size="wide"
                variant="main"
              >
                {$t.reloadApp}
              </Button>
            {/if}
            <Button
              href={extensionStore}
              icon={mdiPlusCircleOutline}
              onclick={() => {
                installingExtension.set(true)
              }}
              size={$installingExtension ? 'pill' : 'wide'}
              target="_blank"
            >
              {$t.installExtension}
            </Button>
          </Stack>
        </Note>
      {/if}
    </Stack>
    {#if $clientUpdate}
      <Stack gap="xs">
        <Label tag="h2">{$t.offlineMode}</Label>
        <Note icon={mdiCloudOffOutline} variant="good">{$t.offline}</Note>
      </Stack>
    {/if}
    <Stack gap="m">
      <Radio
        label={$t.cacheImages}
        onchange={value => {
          cacheImages.set(value)
        }}
        size="wide"
        value={shownDownload($cacheImages)}
        values={downloadValues}
      />
      <Radio
        label={$t.cacheVideos}
        onchange={value => {
          cacheVideos.set(value)
        }}
        size="wide"
        value={shownDownload($cacheVideos)}
        values={downloadValues}
      />
    </Stack>
  </Stack>
</ThinPage>
