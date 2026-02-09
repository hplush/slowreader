<script lang="ts">
  import {
    mdiFireplace,
    mdiFood,
    mdiImport,
    mdiPlusCircleOutline
  } from '@mdi/js'
  import { welcomeMessages as t, type WelcomeReader } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import Button from '../../ui/button.svelte'
  import PageIcon from '../../ui/page-icon.svelte'
  import RichText from '../../ui/rich-text.svelte'
  import Stack from '../../ui/stack.svelte'

  let { reader }: { reader: WelcomeReader } = $props()
</script>

{#if reader.reading === 'fast'}
  <PageIcon path={mdiFood}>
    <Stack gap="l">
      <RichText text={$t.fastDesc} />
      <Stack gap="s" row>
        <Button href={getURL('add')} icon={mdiPlusCircleOutline}
          >{$t.emptyAdd}</Button
        >
        <Button href={getURL('import')} icon={mdiImport}
          >{$t.emptyImport}</Button
        >
      </Stack>
    </Stack>
  </PageIcon>
{:else}
  <PageIcon path={mdiFireplace}>
    <Stack gap="l">
      <RichText text={$t.slowDesc} />
      <Stack gap="s" row>
        <Button href={getURL('add')} icon={mdiPlusCircleOutline}
          >{$t.emptyAdd}</Button
        >
        <Button href={getURL('import')} icon={mdiImport}
          >{$t.emptyImport}</Button
        >
      </Stack>
    </Stack>
  </PageIcon>
{/if}
