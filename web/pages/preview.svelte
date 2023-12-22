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
  import UiCardLink from '../ui/card-link.svelte'
  import UiCardLinks from '../ui/card-links.svelte'
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
    <form id="preview_query" novalidate on:submit|preventDefault>
      <UiCard>
        <UiTextField
          error={$previewUrlError}
          label={$t.urlLabel}
          placeholder="https://mastodon.social/@hplushlab"
          required
          bind:value={url}
        />

        {#if $previewCandidates.length > 0}
          <UiCardLinks>
            {#each $previewCandidates as candidate (candidate.url)}
              <UiCardLink
                name={candidate.title}
                current={$previewCandidate === candidate.url}
                on:click={() => {
                  setPreviewCandidate(candidate.url)
                }}
              />
            {/each}
          </UiCardLinks>
        {/if}

        {#if $previewCandidatesLoading}
          <div class="preview_loading">
            <UiLoader zoneId="preview_query" />
          </div>
        {/if}
      </UiCard>
    </form>
  </div>
  <div slot="two">
    {#if $previewCandidate}
      {#if $previewCandidateAdded === undefined}
        <UiCard>
          <UiLoader />
        </UiCard>
        {#if $previewPosts}
          <OrganizePosts posts={$previewPosts} />
        {/if}
      {:else if $previewCandidateAdded === false}
        <UiCard>
          <button on:click={addPreviewCandidate}>{$t.add}</button>
        </UiCard>
        {#if $previewPosts}
          <OrganizePosts posts={$previewPosts} />
        {/if}
      {:else}
        <OrganizeEdit feedId={$previewCandidateAdded} posts={$previewPosts} />
      {/if}
    {:else}
      <UiUnderConstruction />
    {/if}
  </div>
</UiTwoSteps>

<style>
  .preview_loading {
    margin-top: var(--padding-l);
  }
</style>
