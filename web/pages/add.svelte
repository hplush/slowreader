<script type="ts">
  import { addMessages as t, getSourceFromUrl } from '@slowreader/core'

  let url = ''
</script>

<form>
  <input type="text" bind:value={url} />&nbsp;<button>
    {$t[getSourceFromUrl(url) + 'Add']}
  </button>
</form>

<style>
  form {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
  }
</style>
