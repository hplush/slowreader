<script lang="ts">
  import { generateCredentials } from '@slowreader/core'
  import { startMessages as t } from '@slowreader/core/messages'
</script>

<button on:click={generateCredentials}>{$t.local}</button>
