<script lang="ts">
  import { mdiBackupRestore, mdiTruckDeliveryOutline } from '@mdi/js'
  import {
    type ExportPage,
    organizeMessages,
    exportMessages as t
  } from '@slowreader/core'

  import { askUserToSaveFile } from '../lib/file.ts'
  import Button from '../ui/button.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Stack from '../ui/stack.svelte'
  import TwoOptionsPage from '../ui/two-options-page.svelte'

  let { page }: { page: ExportPage } = $props()
  let { exportingBackup, exportingOpml } = page
</script>

<TwoOptionsPage title={[$organizeMessages.feedsTitle, $t.title]}>
  {#snippet one()}
    <PageIcon path={mdiTruckDeliveryOutline}>
      <Stack gap="l">
        <div>{$t.descOPML}</div>
        <Button
          loader={$exportingOpml}
          onclick={() => {
            askUserToSaveFile('slowreader-rss-feeds.opml', page.exportOpml())
          }}
          size="wide"
        >
          {$t.submitOPML}
        </Button>
      </Stack>
    </PageIcon>
  {/snippet}
  {#snippet two()}
    <PageIcon path={mdiBackupRestore}>
      <Stack gap="l">
        <div>{$t.descBackup}</div>
        <Button
          loader={$exportingBackup}
          onclick={() => {
            askUserToSaveFile('slowreader.json', page.exportBackup())
          }}
          size="wide"
        >
          {$t.submitBackup}
        </Button>
      </Stack>
    </PageIcon>
  {/snippet}
</TwoOptionsPage>
