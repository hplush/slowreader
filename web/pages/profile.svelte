<script lang="ts">
  import { signOut } from '@slowreader/core'
  import { profileMessages as t } from '@slowreader/core/messages'

  import UiButton from '../ui/button.svelte'
  import UiCardTitle from '../ui/card-title.svelte'
  import UiCard from '../ui/card.svelte'
</script>

<UiCard>
  <UiCardTitle>{$t.delete}</UiCardTitle>
  <UiButton
    on:click={() => {
      signOut()
    }}
  >
    {$t.delete}
  </UiButton>
</UiCard>
