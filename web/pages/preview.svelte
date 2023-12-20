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
    router,
    setPreviewCandidate,
    setPreviewUrl
  } from '@slowreader/core'
  import { previewMessages as t } from '@slowreader/core/messages'
  import { onDestroy } from 'svelte'

  import { openURL } from '../stores/router.js'
  import UiCard from '../ui/card.svelte'
  import UiLoader from '../ui/loader.svelte'
  import UiTextField from '../ui/text-field.svelte'
  import UiTwoSteps from '../ui/two-steps.svelte'
  import UiUnderConstruction from '../ui/under-construction.svelte'
  import OrganizeEdit from './organize/edit.svelte'
  import OrganizePosts from './organize/posts.svelte'

  onDestroy(() => {
    clearPreview()
  })

  export let url = ''
  $: {
    let page = router.get()
    if (url === '') {
      if (page.route !== 'add') {
        openURL('add')
      }
    } else {
      setPreviewUrl(url)
      if (
        page.route === 'add' ||
        (page.route === 'preview' && page.params.url !== url)
      ) {
        openURL('preview', { url })
      }
    }
  }
</script>

<UiTwoSteps>
  <div slot="one">
    <form novalidate on:submit|preventDefault>
      <UiCard>
        <form on:submit|preventDefault>
          <UiTextField
            error={$previewUrlError}
            label={$t.urlLabel}
            placeholder="https://mastodon.social/@hplushlab"
            required
            bind:value={url}
          />
        </form>
      </UiCard>
    </form>

    {#if $previewCandidatesLoading}
      <UiLoader />
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

    {#if url === ''}
      <UiUnderConstruction />
    {/if}
  </div>
  <div slot="two">
    {#if $previewCandidate}
      {#if $previewCandidateAdded === undefined}
        <UiLoader />
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
    {:else}
      <UiUnderConstruction />
    {/if}
  </div>
</UiTwoSteps>
