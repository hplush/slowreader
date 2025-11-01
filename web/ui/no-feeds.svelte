<script lang="ts">
  import { mdiPackageVariant } from '@mdi/js'
  import { organizeMessages as t } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from './button.svelte'
  import Placeholder from './placeholder.svelte'
  import Stack from './stack.svelte'
</script>

<Placeholder icon={mdiPackageVariant}>
  <Stack>
    {$t.emptyText}
    <Stack gap="s" row>
      <Button href={getURL('add')}>{$t.emptyAdd}</Button>
      <Button href={getURL('import')}>{$t.emptyImport}</Button>
    </Stack>
  </Stack>
</Placeholder>
