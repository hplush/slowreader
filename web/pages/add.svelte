<script type="ts">
  import {
    addMessages as t,
    getSourceFromUrl,
    isValidResource,
    createResource
  } from '@slowreader/core'

  import { openURL } from '../stores/router'

  let url = ''
  $: resource = createResource(url)

  let input: HTMLInputElement

  function onSubmit(): void {
    if (isValidResource(resource)) {
      openURL('preview', { url: resource.url.href })
    } else {
      input.focus()
    }
  }
</script>

<form on:submit|stopPropagation={onSubmit}>
  <div>
    <input
      type="text"
      bind:value={url}
      bind:this={input}
      required
      aria-invalid={resource === 'invalidUrl'}
      aria-errormessage="pages-add-invalid"
    />&nbsp;<button>
      {$t[getSourceFromUrl(url) + 'Add']}
    </button>
    {#if resource === 'invalidUrl'}
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
