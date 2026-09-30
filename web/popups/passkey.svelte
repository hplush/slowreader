<script lang="ts">
  import { mdiTrashCanOutline } from '@mdi/js'
  import {
    getPopupId,
    i18nFormat,
    type PasskeyPopup,
    cloudMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Input from '../ui/input.svelte'
  import Output from '../ui/output.svelte'
  import Popup from '../ui/popup.svelte'
  import Stack from '../ui/stack.svelte'

  let { popup }: { popup: PasskeyPopup } = $props()
  let { passkey } = $derived(popup)
</script>

<Popup id={getPopupId(popup.name, popup.param)}>
  {#snippet header()}
    <Button
      icon={mdiTrashCanOutline}
      onclick={popup.remove}
      variant="secondary-dangerous"
    >
      {$t.delete}
    </Button>
  {/snippet}
  {#if $passkey}
    <Stack gap="l">
      <Input
        label={$t.passkeyName}
        maxlength={100}
        onchange={(value, valid) => {
          if (valid && value.trim()) void popup.rename(value.trim())
        }}
        required
        value={$passkey.name}
      />
      {#if $passkey.provider}
        <Output label={$t.provider} value={$passkey.provider} />
      {/if}
      <Output
        label={$t.passkeyType}
        value={$passkey.synced ? $t.synced : $t.deviceBound}
      />
      <Output
        label={$t.created}
        value={$i18nFormat.time($passkey.createdAt, { dateStyle: 'medium' })}
      />
      <Output
        label={$t.used}
        value={$i18nFormat.time($passkey.usedAt, { dateStyle: 'medium' })}
      />
    </Stack>
  {/if}
</Popup>
