<script lang="ts">
  import { mdiPackageVariant, mdiPlusCircleOutline, mdiRss } from '@mdi/js'
  import { welcomeMessages as t } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from './button.svelte'
  import PageIcon from './page-icon.svelte'
  import Stack from './stack.svelte'
</script>

<PageIcon path={mdiPackageVariant}>
  <Stack>
    {$t.emptyText}
    <Stack gap="s" row>
      <Button href={getURL('add')} icon={mdiPlusCircleOutline}
        >{$t.emptyAdd}</Button
      >
      <Button href={getURL('import')} icon={mdiRss}>{$t.emptyImport}</Button>
    </Stack>
  </Stack>
</PageIcon>
