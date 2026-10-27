<script lang="ts">
  import { mdiWeatherNight } from '@mdi/js'
  import {
    type CoachPage,
    formatHour,
    i18nFormat,
    settingsMessages,
    solveNightTask,
    coachMessages as t
  } from '@slowreader/core'

  import NightTask from '../ui/night-task.svelte'
  import Select from '../ui/select.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import ThinPage from '../ui/thin-page.svelte'

  let { page }: { page: CoachPage } = $props()
  let { locked, nightLockEnabled, nightLockFrom, nightLockTo } = $derived(page)

  let hours = $derived(
    Array.from({ length: 24 }, (_, hour): [string, string] => [
      String(hour),
      formatHour($i18nFormat, hour)
    ])
  )
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  {#if $locked.locked}
    <Stack align="center" gap="l">
      {$t.settingsLocked({ time: formatHour($i18nFormat, $locked.until) })}
      <NightTask
        onsolve={solveNightTask}
        task={$locked.task}
        wrong={$locked.wrong}
      />
    </Stack>
  {:else}
    <Stack gap="m">
      <Switch
        icon={mdiWeatherNight}
        label={$t.nightLock}
        note={$t.nightLockNote}
        store={nightLockEnabled}
      />
      {#if $nightLockEnabled}
        <Stack row>
          <Select
            label={$t.from}
            onchange={value => {
              page.changeNightLockFrom(Number(value))
            }}
            value={String($nightLockFrom)}
            values={hours}
          />
          <Select
            label={$t.to}
            onchange={value => {
              page.changeNightLockTo(Number(value))
            }}
            value={String($nightLockTo)}
            values={hours}
          />
        </Stack>
      {/if}
    </Stack>
  {/if}
</ThinPage>
