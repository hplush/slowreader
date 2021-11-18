<script>
  import { generateCredentials } from '@slowreader/core'
</script>

<main>
  <button on:click={generateCredentials}>Start local demo</button>
</main>

<style>
  main {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
  }
</style>
