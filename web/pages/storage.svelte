<script lang="ts">
  import { mdiCloudDownloadOutline, mdiTrashCanOutline } from '@mdi/js'
  import {
    formatSize,
    i18nFormat,
    settingsMessages,
    signOut,
    type StoragePage,
    storageMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: StoragePage } = $props()
  let { hasCloud, size } = $derived(page)
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    <Stack>
      <Output
        label={$t.size}
        value={$size === undefined
          ? $t.sizeLoading
          : formatSize($i18nFormat, $size)}
      />
    </Stack>
    <Stack>
      <Title>{$t.dangerousTitle}</Title>
      {#if $hasCloud}
        <Button
          icon={mdiCloudDownloadOutline}
          onclick={() => {
            if (confirm(t.get().rebuildWarning)) {
              page.rebuildDatabase()
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
