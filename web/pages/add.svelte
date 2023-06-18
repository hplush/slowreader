<script lang="ts">
  import {
    previewUrlError,
    setPreviewUrl,
    addMessages as t
  } from '@slowreader/core'

  import { openURL } from '../stores/router'

  let url = ''
  $: setPreviewUrl(url)

  let input: HTMLInputElement

  function onSubmit(): void {
    if (!previewUrlError.get()) {
      openURL('preview', { url })
    } else {
      input.focus()
    }
  }
</script>

<form on:submit|stopPropagation={onSubmit}>
  <label>
    {$t.url}
    <!-- Field has good description, user will be in context -->
    <!-- svelte-ignore a11y-autofocus -->
    <input
      type="text"
      bind:value={url}
      bind:this={input}
      required
      autofocus
      aria-invalid={$previewUrlError === 'invalid'}
      aria-errormessage="pages-add-invalid"
    /></label
  >&nbsp;<button>
    {$t.add}
  </button>
  {#if $previewUrlError === 'invalid'}
    <div class="error" role="alert" id="pages-add-invalid">
      {$t.invalidUrl}
    </div>
  {/if}
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
