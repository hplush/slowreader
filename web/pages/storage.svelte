<script lang="ts">
  import {
    mdiBinoculars,
    mdiBroom,
    mdiCloudDownloadOutline,
    mdiTrashCanOutline
  } from '@mdi/js'
  import {
    formatSize,
    i18nFormat,
    isDemo,
    settingsMessages,
    signOut,
    type StoragePage,
    storageMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: StoragePage } = $props()
  let { hasCloud, size } = $derived(page)
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    {#if $isDemo}
      <Note icon={mdiBinoculars} title={$t.demoTitle} variant="warning">
        <Stack gap="m">
          {$t.demoDesc}
          <Stack gap="xs" row>
            <Button
              joined="start"
              onclick={page.dropDemo}
              size="wide"
              variant="secondary-dangerous"
            >
              {$t.demoDrop}
            </Button>
            <Button
              joined="end"
              onclick={page.keepDemo}
              size="wide"
              variant="secondary"
            >
              {$t.demoKeep}
            </Button>
          </Stack>
        </Stack>
      </Note>
    {/if}
    <Stack>
      <Output
        label={$t.size}
        value={$size === undefined
          ? $t.sizeLoading
          : formatSize($i18nFormat, $size)}
      />
      <Button icon={mdiBroom} onclick={page.compact} size="wide">
        {$t.compact}
      </Button>
    </Stack>
    <Stack>
      <Title>{$t.dangerousTitle}</Title>
      {#if $hasCloud}
        <Button
          icon={mdiCloudDownloadOutline}
          onclick={() => {
            if (confirm(t.get().rebuildWarning)) {
              page.resetDatabase()
            }
          }}
          size="wide"
          variant="secondary"
        >
          {$t.rebuild}
        </Button>
      {:else}
        <Button
          icon={mdiTrashCanOutline}
          onclick={() => {
            if (confirm(t.get().deleteWarning)) {
              signOut()
            }
          }}
          size="wide"
          variant="secondary-dangerous"
        >
          {$t.deleteData}
        </Button>
      {/if}
    </Stack>
  </Stack>
</ThinPage>
