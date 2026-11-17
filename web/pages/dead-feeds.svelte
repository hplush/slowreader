<script lang="ts">
  import { mdiHeartPulse } from '@mdi/js'
  import {
    type DeadFeedsPage,
    organizeMessages,
    deadFeedsMessages as t
  } from '@slowreader/core'

  import Feeds from '../ui/feeds.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: DeadFeedsPage } = $props()

  let { groups, hints, opened, readings } = $derived(page)
</script>

<PopupablePage padding title={[$t.title, $organizeMessages.feedsTitle]}>
  {#if $groups.length === 0}
    <Stack align="center">
      <PageIcon path={mdiHeartPulse}>{$t.empty}</PageIcon>
    </Stack>
  {:else}
    <Stack gap="xl" role="menu">
      {#each $groups as [name, feeds] (name)}
        <Stack>
          <Stack controls={`${name}-feeds`} role="menuitem">
            <Title>{$t[name]}</Title>
          </Stack>
          <Feeds
            id={`${name}-feeds`}
            current={$opened}
            hints={$hints}
            list={feeds}
            readings={$readings}
            variant={name === 'missing' ? 'dangerous' : undefined}
          />
        </Stack>
      {/each}
    </Stack>
  {/if}
</PopupablePage>
