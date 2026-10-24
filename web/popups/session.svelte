<script lang="ts">
  import { mdiLogout } from '@mdi/js'
  import {
    getPopupId,
    i18nFormat,
    type SessionPopup,
    cloudMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'
  import Title from '../ui/title.svelte'

  let { popup }: { popup: SessionPopup } = $props()
  let { session } = $derived(popup)
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  {#snippet header()}
    <Button
      icon={mdiLogout}
      onclick={popup.signOut}
      variant={$session?.current ? 'secondary' : 'secondary-dangerous'}
    >
      {$t.signOutSession}
    </Button>
  {/snippet}
  {#if $session}
    <Stack gap="l">
      <Title>{$session.name}</Title>
      {#if $session.current}
        <Output font="normal" label={$t.sessionStatus} value={$t.thisDevice} />
      {:else if $session.online}
        <Output font="normal" label={$t.sessionStatus} value={$t.online} />
      {/if}
      {#if $session.method.type === 'passkey'}
        <Output
          font="normal"
          label={$t.signInMethod}
          value={$session.method.name}
        />
      {:else if $session.method.type === 'deleted'}
        <Output
          font="normal"
          label={$t.signInMethod}
          value={$t.byDeletedPasskey}
        />
      {:else}
        <Output font="normal" label={$t.signInMethod} value={$t.byPassword} />
      {/if}
      <Output
        font="normal"
        label={$t.created}
        value={$i18nFormat.time($session.createdAt, {
          dateStyle: 'medium',
          timeStyle: 'short'
        })}
      />
      <Output
        font="normal"
        label={$t.used}
        value={$i18nFormat.time($session.usedAt, {
          dateStyle: 'medium',
          timeStyle: 'short'
        })}
      />
    </Stack>
  {/if}
</Popup>
