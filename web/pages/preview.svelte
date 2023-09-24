<script lang="ts">
  import {
    addPreviewCandidate,
    clearPreview,
    previewCandidate,
    previewCandidateAdded,
    previewCandidates,
    previewCandidatesLoading,
    previewPosts,
    previewUrlError,
    setPreviewCandidate,
    setPreviewUrl
  } from '@slowreader/core'
  import { previewMessages as t } from '@slowreader/core/messages'
  import { onDestroy } from 'svelte'

  import { openURL } from '../stores/router.js'
  import OrganizeEdit from './organize/edit.svelte'
  import OrganizePosts from './organize/posts.svelte'

  onDestroy(() => {
    clearPreview()
  })

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
{/if}
