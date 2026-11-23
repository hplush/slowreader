<script lang="ts">
  import {
    mdiCloudAlert,
    mdiCloudCheckVariant,
    mdiCloudDownloadOutline,
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
    receiving: mdiCloudDownloadOutline,
    sending: mdiCloudUpload,
    sendingAfterWait: mdiCloudUpload,
    synchronizedAfterWait: mdiCloudCheckVariant,
    wait: mdiCloudOff,
    wrongCredentials: mdiCloudAlert
  } satisfies Partial<Record<SyncStatus, string>>

  const COLORS = {
    error: 'dangerous',
    other: 'secondary',
    wait: undefined
  } as const
</script>

{#if $syncStatus !== 'synchronized' && $syncStatus !== 'local'}
  {@const iconOnly =
    $syncStatus === 'sending' || $syncStatus === 'sendingAfterWait'}
  <div class="navbar-sync" class:is-icon-only={iconOnly}>
    <Button
      color={COLORS[$syncStatusType]}
      href={getURL({ params: {}, route: 'cloud' })}
      icon={ICONS[$syncStatus]}
      size={iconOnly ? 'icon-pill' : 'pill'}
      variant="plain"
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

<style lang="postcss">
  :global {
    .navbar-sync {
      padding: 0 0.375rem;

      @media (--desktop) {
        &.is-icon-only {
          position: absolute;
          bottom: 0;
          inset-inline-start: 0;
        }
      }

      @media (--no-desktop) {
        @mixin background var(--land-color);

        position: fixed;
        top: 0.5rem;
        inset-inline-end: calc(var(--page-padding) + 0.125rem);
        z-index: 3;
        padding: 0;
        border-radius: 0.75rem;
      }
    }
  }
</style>
