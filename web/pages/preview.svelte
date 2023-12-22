<script lang="ts">
  import { mdiPlusCircleOutline } from '@mdi/js'
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
  import UiButton from '../ui/button.svelte'
  import UiCardLink from '../ui/card-link.svelte'
  import UiCardLinks from '../ui/card-links.svelte'
  import UiCard from '../ui/card.svelte'
  import UiLoader from '../ui/loader.svelte'
  import UiTextField from '../ui/text-field.svelte'
  import UiTwoStepsPage from '../ui/two-steps-page.svelte'
  import OrganizeEdit from './organize/edit.svelte'
  import OrganizePosts from './organize/posts.svelte'

  export let url: string

  onDestroy(() => {
    clearPreview()
  })
  $: {
    let page = router.get()
    if (url === '') {
      clearPreview()
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

<UiTwoStepsPage title={$t.title}>
  <div slot="one">
    <UiCard>
      <UiTextField
        error={$previewUrlError}
        label={$t.urlLabel}
        placeholder="https://mastodon.social/@hplushlab"
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
        <div class="preview_url-loading">
          <UiLoader zoneId="preview_query" />
        </div>
      {/if}
    </UiCard>

    {#if url === ''}
      <div class="preview_guide">
        {$t.searchGuide}
      </div>
    {/if}
  </div>
  <div id="preview_feed" slot="two">
    {#if $previewCandidate}
      {#if $previewCandidateAdded === undefined}
        <div class="preview_feed-loading">
          <UiLoader zoneId="preview_feed" />
        </div>
        {#if $previewPosts}
          <OrganizePosts posts={$previewPosts} />
        {/if}
      {:else if $previewCandidateAdded === false}
        <UiButton icon={mdiPlusCircleOutline} on:click={addPreviewCandidate}>
          {$t.add}
        </UiButton>
        {#if $previewPosts}
          <OrganizePosts posts={$previewPosts} />
        {/if}
      {:else}
        <OrganizeEdit feedId={$previewCandidateAdded} posts={$previewPosts} />
      {/if}
    {/if}
  </div>
</UiTwoStepsPage>

<style>
  .preview_url-loading {
    margin-top: var(--padding-l);
  }

  .preview_guide {
    max-width: 450px;
    padding-top: 100px;
    margin: 0 auto;
  }

  .preview_feed-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: var(--control-height);
  }
</style>
