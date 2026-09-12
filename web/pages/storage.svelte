<script lang="ts">
  import {
    mdiBroom,
    mdiCloudDownloadOutline,
    mdiDatabaseExport,
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
  import DemoNote from '../ui/demo-note.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: StoragePage } = $props()
  let { dumpDatabase, hasCloud, size } = $derived(page)
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    {#if $isDemo}
      <DemoNote type="storage" />
    {/if}
    <Stack>
      <Output
        label={$t.size}
        value={$size === undefined
          ? $t.sizeLoading
          : formatSize($i18nFormat, $size)}
      />
      <Stack gap="xs" row>
        <Button
          icon={mdiBroom}
          joined={dumpDatabase ? 'start' : undefined}
          onclick={page.compact}
          size="wide"
        >
          {$t.compact}
        </Button>
        {#if dumpDatabase}
          <Button
            icon={mdiDatabaseExport}
            joined="end"
            onclick={dumpDatabase}
            size="wide"
          >
            {$t.dump}
          </Button>
        {/if}
      </Stack>
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
