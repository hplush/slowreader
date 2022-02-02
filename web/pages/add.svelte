<script type="ts">
  import {
    addMessages as t,
    getSourceFromUrl,
    normalizeUrl
  } from '@slowreader/core'

  let url = ''
  $: invalid = normalizeUrl(url) === 'invalid'
</script>

<form>
  <div>
    <input
      type="text"
      bind:value={url}
      aria-invalid={invalid}
      required
      aria-errormessage="pages-add-invalid"
    />&nbsp;<button>
      {$t[getSourceFromUrl(url) + 'Add']}
    </button>
    {#if invalid}
      <div class="error" role="alert" id="pages-add-invalid">
        {$t.invalidUrl}
      </div>
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
