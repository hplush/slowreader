<script lang="ts">
  import { signOut } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'

  import UiButton from '../ui/button.svelte'
  import UiCardActions from '../ui/card-actions.svelte'
  import UiCard from '../ui/card.svelte'
  import UiSettings from '../ui/settings.svelte'
  import UiUnderConstruction from '../ui/under-construction.svelte'
</script>

<UiSettings title={$t.profile}>
  <UiCard>
    <UiUnderConstruction />
    <UiCardActions>
      <UiButton
        on:click={() => {
          if (!confirm($t.deleteProfileConfirm)) return
          signOut()
        }}
      >
        {$t.deleteProfile}
      </UiButton>
    </UiCardActions>
  </UiCard>
</UiSettings>
