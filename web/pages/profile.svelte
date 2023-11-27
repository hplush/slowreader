<script lang="ts">
  import { signOut } from '@slowreader/core'
  import { profileMessages as t } from '@slowreader/core/messages'

  import UiButton from '../ui/button.svelte'
</script>

<UiButton
  on:click={() => {
    signOut()
  }}
>
  {$t.delete}
</UiButton>
