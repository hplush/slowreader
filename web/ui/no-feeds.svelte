<script lang="ts">
  import { mdiImport, mdiPackageVariant, mdiPlusCircleOutline } from '@mdi/js'
  import { organizeMessages as t } from '@slowreader/core'

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
      <Button href={getURL('import')} icon={mdiImport}>{$t.emptyImport}</Button>
    </Stack>
  </Stack>
</PageIcon>
