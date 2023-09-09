<script lang="ts">
  import {
    addPreviewCandidate,
    previewCandidate,
    previewCandidateAdded,
    previewCandidates,
    previewCandidatesLoading,
    previewPosts,
    previewUrlError,
    setPreviewCandidate,
    setPreviewUrl,
    addMessages as t
  } from '@slowreader/core'

  import { openURL } from '../stores/router.js'
  import OrganizeEdit from './organize/edit.svelte'
  import OrganizePosts from './organize/posts.svelte'

  export let url = ''
  setPreviewUrl(url)
  $: {
    setPreviewUrl(url)
    if (url === '') {
      openURL('add')
    } else {
      openURL('preview', { url })
    }
  }
</script>

<form on:submit|preventDefault>
  <!-- Field has good description, user will be in context -->
  <!-- svelte-ignore a11y-autofocus -->
  <input
    aria-errormessage="pages-add-invalid"
    aria-invalid={$previewUrlError === 'invalid'}
    autofocus
    required
    type="text"
    bind:value={url}
  />
  {#if $previewUrlError === 'invalid'}
    <div id="pages-add-invalid" role="alert">
      {$t.invalidUrl}
    </div>
  {/if}
</form>

{#if $previewCandidatesLoading}
  {$t.loading}
{:else}
  <ul>
    {#each $previewCandidates as candidate (candidate.url)}
      <li>
        <button
          disabled={$previewCandidate === candidate.url}
          on:click={() => {
            setPreviewCandidate(candidate.url)
          }}
        >
          {candidate.title}
        </button>
      </li>
    {/each}
  </ul>
{/if}

{#if $previewCandidate}
  <form on:submit|preventDefault>
    {#if $previewCandidateAdded === undefined}
      {$t.loading}
      {#if $previewPosts}
        <OrganizePosts posts={$previewPosts} />
      {/if}
    {:else if $previewCandidateAdded === false}
      <button on:click={addPreviewCandidate}>{$t.add}</button>
      {#if $previewPosts}
        <OrganizePosts posts={$previewPosts} />
      {/if}
    {:else}
      {$t.alreadyAdded}
      <OrganizeEdit feedId={$previewCandidateAdded} posts={$previewPosts} />
    {/if}
  </form>
{/if}
