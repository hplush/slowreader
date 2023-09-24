<script lang="ts">
  import { signOut } from '@slowreader/core'
  import { profileMessages as t } from '@slowreader/core/messages'
</script>

<button
  on:click={() => {
    signOut()
  }}>{$t.delete}</button
>
