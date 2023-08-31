<script lang="ts">
  import {
    addPreviewCandidate,
    previewCandidate,
    previewCandidateAdded,
    previewCandidates,
    previewCandidatesLoading,
    previewDraft,
    previewPosts,
    previewPostsLoading,
    previewUrlError,
    setPreviewCandidate,
    setPreviewReading,
    setPreviewTitle,
    setPreviewUrl,
    addMessages as t
  } from '@slowreader/core'

  import { getURL, openURL } from '../stores/router.js'
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
    type="text"
    bind:value={url}
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
  <form on:submit|preventDefault>
    {#if $previewCandidateAdded === undefined}
      {$t.loading}
    {:else if $previewCandidateAdded === false}
      <button on:click={addPreviewCandidate}>{$t.add}</button>

      <OrganizeEdit
        title={$previewDraft.title}
        reading={$previewDraft.reading}
        setReading={setPreviewReading}
        setTitle={setPreviewTitle}
      />
    {:else}
      {$t.alreadyAdded}
      <a href={getURL('feed', { id: $previewCandidateAdded })}>{$t.edit}</a>
    {/if}
  </form>

  <OrganizePosts posts={$previewPosts} postsLoading={$previewPostsLoading} />
{/if}
