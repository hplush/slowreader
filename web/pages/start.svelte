<script>
  import { generateCredentials, startMessages as t } from '@slowreader/core'
</script>

<button on:click={generateCredentials}>{$t.local}</button>
