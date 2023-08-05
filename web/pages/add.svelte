<script lang="ts">
  import {
    addPreviewCandidate,
    previewCandidate,
    previewCandidateAdded,
    previewCandidates,
    previewCandidatesLoading,
    previewPosts,
    previewPostsLoading,
    previewUrlError,
    setPreviewCandidate,
    setPreviewUrl,
    addMessages as t
  } from '@slowreader/core'

  import { openURL } from '../stores/router.js'

  export let url = ''
  setPreviewUrl(url)
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
  />
  {#if $previewUrlError === 'invalid'}
    <div class="error" role="alert" id="pages-add-invalid">
      {$t.invalidUrl}
    </div>
  {/if}
</form>

{#if $previewCandidatesLoading}
  {$t.loading}
{:else}
  <ul>
    {#each $previewCandidates as candidate}
      <li>
        <button
          on:click={() => {
            setPreviewCandidate(candidate.url)
          }}
          disabled={$previewCandidate === candidate.url}
        >
          {candidate.title}
        </button>
      </li>
    {/each}
  </ul>
{/if}

{#if $previewCandidate}
  {#if $previewCandidateAdded === undefined}
    {$t.loading}
  {:else if $previewCandidateAdded === false}
    <button on:click={addPreviewCandidate}>{$t.add}</button>
  {:else}
    {$t.alreadyAdded}
  {/if}
  {#if $previewPostsLoading}
    {$t.loading}
  {:else}
    <ul>
      {#each $previewPosts as post}
        <li>
          {#if post.url}
            <a href={post.url}>{post.title ?? post.intro ?? post.full}</a>
          {:else}
            {post.title ?? post.intro ?? post.full}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
{/if}
