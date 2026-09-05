<script lang="ts">
  import {
    mdiGaugeLow,
    mdiPlusCircleOutline,
    mdiPuzzle,
    mdiSignal,
    mdiWifi
  } from '@mdi/js'
  import {
    layoutType,
    preloadImages,
    requestMethod,
    settingsMessages,
    networkMessages as t
  } from '@slowreader/core'

  import { hasExtension } from '../main/extension.ts'
  import { usedRequestMethod } from '../stores/request-method.ts'
  import Button from '../ui/button.svelte'
  import Note from '../ui/note.svelte'
  import RadioList from '../ui/radio-list.svelte'
  import Radio from '../ui/radio.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
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
          disabled: !$hasExtension,
          name: $t.extension,
          value: 'extension'
        }
      ]}
    />
    <!-- Mobile browsers can not install the extension -->
    {#if !$hasExtension && $layoutType !== 'mobile'}
      <Note icon={mdiPuzzle} variant="good">
        {$t.noExtension}
        <Button icon={mdiPlusCircleOutline} size="wide"
          >{$t.installExtension}</Button
        >
      </Note>
    {/if}
    <div style:display="none">
      <Radio
        label={$t.preloadImages}
        onchange={value => {
          preloadImages.set(value)
        }}
        size="wide"
        value={$preloadImages}
        values={[
          ['always', $t.preloadAlways, mdiSignal],
          ['free', $t.preloadFree, mdiWifi],
          ['never', $t.preloadNever, mdiGaugeLow]
        ]}
      />
    </div>
  </Stack>
</ThinPage>
