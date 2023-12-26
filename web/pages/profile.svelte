<script lang="ts">
  import { signOut } from '@slowreader/core'
  import { settingsMessages as t } from '@slowreader/core/messages'

  import UiButton from '../ui/button.svelte'
  import UiCardActions from '../ui/card-actions.svelte'
  import UiCard from '../ui/card.svelte'
  import UiPage from '../ui/page.svelte'
  import UiUnderConstruction from '../ui/under-construction.svelte'
</script>

<UiPage title={$t.profile} type="settings">
  <UiCard>
    <UiUnderConstruction />
    <UiCardActions>
      <UiButton
        dangerous
        on:click={() => {
          if (!confirm($t.deleteProfileConfirm)) return
          signOut()
        }}
      >
        {$t.deleteProfile}
      </UiButton>
    </UiCardActions>
  </UiCard>
</UiPage>
