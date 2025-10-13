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
    navbarMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import Clickable from '../clickable.svelte'
  import Icon from '../icon.svelte'

  const ICONS = {
    connecting: mdiCloudRefreshVariantOutline,
    connectingAfterWait: mdiCloudRefreshVariant,
    disconnected: mdiCloudOffOutline,
    error: mdiCloudAlert,
    sending: mdiCloudUpload,
    sendingAfterWait: mdiCloudUpload,
    synchronizedAfterWait: mdiCloudCheckVariant,
    wait: mdiCloudOff
  } satisfies Partial<Record<SyncStatus, string>>

  let isWait = $derived(
    $syncStatus === 'wait' ||
      $syncStatus === 'connectingAfterWait' ||
      $syncStatus === 'disconnected' ||
      $syncStatus === 'connecting' ||
      $syncStatus === 'sending' ||
      $syncStatus === 'sendingAfterWait'
  )
</script>

{#if $syncStatus !== 'synchronized' && $syncStatus !== 'local'}
  <Clickable
    class={{
      'is-dangerous': $syncStatus === 'error',
      'is-wait': isWait,
      'navbar-sync': true
    }}
    href={getURL({ params: {}, route: 'profile' })}
  >
    <Icon path={ICONS[$syncStatus]} />
    {#if $syncStatus === 'wait' || $syncStatus === 'disconnected'}
      {$t.offlineStatus}
    {:else if $syncStatus === 'connecting' || $syncStatus === 'connectingAfterWait'}
      {$t.connectingStatus}
    {:else if $syncStatus === 'sending' || $syncStatus === 'sendingAfterWait'}
      {$t.sending}
    {:else}
      {$t[`${$syncStatus}Status`]}
    {/if}
  </Clickable>
{/if}

<style>
  :global {
    .navbar-sync {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 0.25rem 0.5rem;
      margin: 0.25rem 0 0.25rem 0.25rem;
      font: var(--control-secondary-font);
      color: var(--text-color);
      text-decoration: none;
      border-radius: var(--base-radius);

      &.is-wait {
        color: var(--secondary-text-color);
      }

      &.is-dangerous {
        color: var(--dangerous-text-color);
      }

      &:hover,
      &:focus-visible {
        color: var(--text-color);
        background: --tune-background(--secondary, --secondary-hover);
      }

      &:active {
        /* 1px gap on any scale */
        /* stylelint-disable-next-line unit-disallowed-list */
        padding-top: calc(0.25rem + 1px);
        /* stylelint-disable-next-line unit-disallowed-list */
        padding-bottom: calc(0.25rem - 1px);
        box-shadow: var(--pressed-shadow);
      }

      @media (width <= 64rem) {
        display: none;
      }
    }
  }
</style>
