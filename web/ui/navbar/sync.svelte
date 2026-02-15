<script lang="ts">
  import {
    mdiCloudAlert,
    mdiCloudCheckVariant,
    mdiCloudOff,
    mdiCloudOffOutline,
    mdiCloudRefreshVariant,
    mdiCloudRefreshVariantOutline,
    mdiCloudUpload
  } from '@mdi/js'
  import {
    syncStatus,
    type SyncStatus,
    syncStatusType,
    navbarMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import Button from '../button.svelte'

  const ICONS = {
    connecting: mdiCloudRefreshVariantOutline,
    connectingAfterWait: mdiCloudRefreshVariant,
    disconnected: mdiCloudOffOutline,
    error: mdiCloudAlert,
    sending: mdiCloudUpload,
    sendingAfterWait: mdiCloudUpload,
    synchronizedAfterWait: mdiCloudCheckVariant,
    wait: mdiCloudOff,
    wrongCredentials: mdiCloudAlert
  } satisfies Partial<Record<SyncStatus, string>>

  let STYLES = {
    error: 'plain-dangerous',
    other: 'plain-secondary',
    wait: 'plain'
  } as const
</script>

{#if $syncStatus !== 'synchronized' && $syncStatus !== 'local'}
  <div class="navbar-sync">
    <Button
      href={getURL({ params: {}, route: 'cloud' })}
      icon={ICONS[$syncStatus]}
      size="pill"
      variant={STYLES[$syncStatusType]}
    >
      {#if $syncStatus === 'wait' || $syncStatus === 'disconnected'}
        {$t.offlineStatus}
      {:else if $syncStatus === 'connecting' || $syncStatus === 'connectingAfterWait'}
        {$t.connectingStatus}
      {:else if $syncStatus === 'sending' || $syncStatus === 'sendingAfterWait'}
        {$t.sending}
      {:else}
        {$t[`${$syncStatus}Status`]}
      {/if}
    </Button>
  </div>
{/if}

<style>
  :global {
    .navbar-sync {
      padding: 0 0.375rem;

      @media (--no-desktop) {
        display: none;
      }
    }
  }
</style>
