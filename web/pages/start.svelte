<script>
  import { generateCredentials, startMessages as t } from '@slowreader/core'
</script>

<main>
  <button on:click={generateCredentials}>{$t.local}</button>
</main>

<style>
  main {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
  }
</style>
