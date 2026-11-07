<script lang="ts">
  import { mdiScaleBalance, mdiTimerOutline, mdiWeatherNight } from '@mdi/js'
  import {
    type CoachPage,
    formatDuration,
    formatHour,
    i18nFormat,
    settingsMessages,
    showUsageBalance,
    solveNightTask,
    coachMessages as t,
    trackUsage
  } from '@slowreader/core'

  import Card from '../ui/card.svelte'
  import NightTask from '../ui/night-task.svelte'
  import ReadingNumbers from '../ui/reading-numbers.svelte'
  import Select from '../ui/select.svelte'
  import Stack from '../ui/stack.svelte'
  import Switch from '../ui/switch.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
  import UsageTimeline from '../ui/usage-timeline.svelte'

  let { page }: { page: CoachPage } = $props()
  let {
    locked,
    nightLockEnabled,
    nightLockFrom,
    nightLockTo,
    usageSum,
    usageTimeline
  } = $derived(page)

  let hours = $derived(
    Array.from({ length: 24 }, (_, hour): [string, string] => [
      String(hour),
      formatHour($i18nFormat, hour)
    ])
  )
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="l">
    <Card width="stretch">
      <Stack gap="m">
        <Title>{$t.usageTitle}</Title>
        <Switch
          icon={mdiTimerOutline}
          label={$t.trackUsage}
          store={trackUsage}
        />
        {#if $trackUsage}
          <Stack align="stretch" gap="s">
            <ReadingNumbers
              fast={formatDuration($i18nFormat, $usageSum.fast)}
              legend
              slow={formatDuration($i18nFormat, $usageSum.slow)}
            />
            <UsageTimeline
              marks={$usageTimeline.marks}
              parts={$usageTimeline.parts}
            />
          </Stack>
          <Switch
            icon={mdiScaleBalance}
            label={$t.showBalance}
            note={$t.showBalanceNote}
            store={showUsageBalance}
          />
        {/if}
      </Stack>
    </Card>
    <Card width="stretch">
      <Stack gap="m">
        <Title>{$t.nightLockGroup}</Title>
        {#if $locked.locked}
          <Stack align="center" gap="l">
            {$t.settingsLocked({
              time: formatHour($i18nFormat, $locked.until)
            })}
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
      </Stack>
    </Card>
  </Stack>
</ThinPage>
