<script lang="ts">
  import { mdiFire, mdiFireOff, mdiReload, mdiWhiteBalanceSunny } from '@mdi/js'
  import {
    type EmptyReader,
    isRefreshing,
    refreshPosts,
    refreshProgress,
    welcomeMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import Button from '../../ui/button.svelte'
  import PageIcon from '../../ui/page-icon.svelte'
  import Stack from '../../ui/stack.svelte'

  let { reader }: { reader: EmptyReader } = $props()
</script>

{#if reader.reading === 'fast'}
  <PageIcon path={mdiWhiteBalanceSunny}>
    <Stack align="center" gap="l">
      {reader.category ? $t.fastCategoryEmpty : $t.fastEmpty}
      <div class="is-comfort-mode">
        <Button href={getURL('slow')} icon={mdiFire}>{$t.openSlow}</Button>
      </div>
    </Stack>
  </PageIcon>
{:else}
  <PageIcon path={mdiFireOff}>
    <Stack align="center" gap="l">
      {$t.slowEmpty}
      <div class="is-comfort-mode">
        <Button
          icon={mdiReload}
          loader={$isRefreshing ? $refreshProgress : undefined}
          onclick={refreshPosts}>{$t.refresh}</Button
        >
      </div>
    </Stack>
  </PageIcon>
{/if}
