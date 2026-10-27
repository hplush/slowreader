<script lang="ts">
  import { mdiWeatherNight } from '@mdi/js'
  import {
    type FeedsPage,
    formatHour,
    i18nFormat,
    solveNightTask,
    coachMessages as t
  } from '@slowreader/core'

  import NightTask from '../../ui/night-task.svelte'
  import PageIcon from '../../ui/page-icon.svelte'
  import Stack from '../../ui/stack.svelte'

  let { page }: { page: FeedsPage } = $props()
  let { locked } = $derived(page)
</script>

{#if $locked.locked}
  <PageIcon path={mdiWeatherNight}>
    <Stack align="center" gap="l">
      {$t.locked({ time: formatHour($i18nFormat, $locked.until) })}
      <NightTask
        onsolve={solveNightTask}
        task={$locked.task}
        wrong={$locked.wrong}
      />
    </Stack>
  </PageIcon>
{/if}
