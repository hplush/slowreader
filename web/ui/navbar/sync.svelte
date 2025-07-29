<script lang="ts">
  import {
    mdiCloudAlert,
    mdiCloudCheckVariant,
    mdiCloudOff,
    mdiCloudOffOutline,
    mdiCloudRefreshVariant,
    mdiCloudRefreshVariantOutline
  } from '@mdi/js'
  import {
    syncStatus,
    type SyncStatus,
    navbarMessages as t
  } from '@slowreader/core'

  import Icon from '../icon.svelte'

  const ICONS = {
    connecting: mdiCloudRefreshVariantOutline,
    connectingAfterWait: mdiCloudRefreshVariant,
    disconnected: mdiCloudOffOutline,
    error: mdiCloudAlert,
    synchronizedAfterWait: mdiCloudCheckVariant,
    wait: mdiCloudOff
  } satisfies Partial<Record<SyncStatus, string>>
</script>

{#if $syncStatus !== 'synchronized' && $syncStatus !== 'local'}
  <div
    class="navbar-sync"
    class:is-dangerous={$syncStatus === 'error'}
    class:is-wait={$syncStatus === 'wait' ||
      $syncStatus === 'connectingAfterWait' ||
      $syncStatus === 'disconnected' ||
      $syncStatus === 'connecting'}
  >
    <Icon path={ICONS[$syncStatus]} />
    {#if $syncStatus === 'wait' || $syncStatus === 'disconnected'}
      {$t.offlineStatus}
    {:else if $syncStatus === 'connecting' || $syncStatus === 'connectingAfterWait'}
      {$t.connectingStatus}
    {:else}
      {$t[`${$syncStatus}Status`]}
    {/if}
  </div>
{/if}

<style>
  :global {
    .navbar-sync {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem;
      font: var(--control-secondary-font);

      &.is-wait {
        color: var(--secondary-text-color);
      }

      &.is-dangerous {
        color: var(--dangerous-text-color);
      }

      @media (width <= 64rem) {
        display: none;
      }
    }
  }
</style>
