<script type="ts">
  import {
    addMessages as t,
    getSourceFromUrl,
    normalizeUrl
  } from '@slowreader/core'

  let url = ''
</script>

<form>
  <div>
    <input type="text" bind:value={url} />&nbsp;<button>
      {$t[getSourceFromUrl(url) + 'Add']}
    </button>
    {#if normalizeUrl(url) === 'invalid'}
      <div class="error">{$t.invalidUrl}</div>
    {/if}
  </div>
</form>

<style>
  form {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100%;
  }

  .error {
    color: var(--error-text);
  }
</style>
