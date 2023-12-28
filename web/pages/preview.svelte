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
  import debounce from 'just-debounce-it'
  import { onDestroy } from 'svelte'

  import { jumpInto } from '../lib/hotkeys.js'
  import { openURL } from '../stores/router.js'
  import Button from '../ui/button.svelte'
  import CardLink from '../ui/card-link.svelte'
  import CardLinks from '../ui/card-links.svelte'
  import Card from '../ui/card.svelte'
  import Loader from '../ui/loader.svelte'
  import RichTranslation from '../ui/rich-translation.svelte'
  import TextField from '../ui/text-field.svelte'
  import TwoStepsPage from '../ui/two-steps-page.svelte'
  import OrganizeEdit from './organize/edit.svelte'
  import OrganizePosts from './organize/posts.svelte'

  export let url: string
  let links: HTMLUListElement
  let feed: HTMLDivElement
  let requested = false

  let updateUrl = debounce((value: string) => {
    requested = true
    setPreviewUrl(value)
    let page = router.get()
    if (
      page.route === 'add' ||
      (page.route === 'preview' && page.params.url !== url)
    ) {
      openURL('preview', { url })
    }
  }, 500)

  function onSearchEnter(): void {
    if ($previewCandidates.length > 0) {
      jumpInto(links)
    }
  }

  function onLinkEnter(): void {
    jumpInto(feed)
  }

  onDestroy(() => {
    clearPreview()
  })

  $: if (url === '') {
    requested = false
    clearPreview()
    if (router.get().route !== 'add') {
      openURL('add')
    }
  } else {
    updateUrl(url)
  }
</script>

<TwoStepsPage title={$t.title}>
  <div slot="one">
    <Card>
      <TextField
        enterHint={$previewCandidates.length > 0}
        error={$previewUrlError ? $t[$previewUrlError] : undefined}
        label={$t.urlLabel}
        placeholder="https://mastodon.social/@hplushlab"
        bind:value={url}
        on:enter={onSearchEnter}
      />

      {#if $previewCandidates.length > 0}
        <CardLinks bind:node={links} on:enter={onLinkEnter}>
          {#each $previewCandidates as candidate (candidate.url)}
            <CardLink
              name={candidate.title}
              current={$previewCandidate === candidate.url}
              on:click={() => {
                setPreviewCandidate(candidate.url)
              }}
            />
          {/each}
        </CardLinks>
      {/if}

      {#if $previewCandidatesLoading}
        <div class="preview_url-loading">
          <Loader zoneId="preview_query" />
        </div>
      {/if}

      {#if !$previewCandidatesLoading && url !== '' && $previewCandidates.length === 0 && requested && !$previewUrlError}
        <div class="preview_no-results">
          <RichTranslation
            text={$t.noResults}
            url="https://github.com/hplush/slowreader/issues"
          />
        </div>
      {/if}
    </Card>

    {#if url === ''}
      <div class="preview_guide">
        <RichTranslation text={$t.searchGuide} />
      </div>
    {/if}
  </div>
  <div bind:this={feed} id="preview_feed" slot="two">
    {#if $previewCandidate}
      {#if $previewCandidateAdded === undefined}
        <div class="preview_feed-loading">
          <Loader zoneId="preview_feed" />
        </div>
        {#if $previewPosts}
          <OrganizePosts posts={$previewPosts} />
        {/if}
      {:else if $previewCandidateAdded === false}
        <Button icon={mdiPlusCircleOutline} on:click={addPreviewCandidate}>
          {$t.add}
        </Button>
        {#if $previewPosts}
          <OrganizePosts posts={$previewPosts} />
        {/if}
      {:else}
        <OrganizeEdit feedId={$previewCandidateAdded} posts={$previewPosts} />
      {/if}
    {/if}
  </div>
</TwoStepsPage>

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

  .preview_no-results {
    margin-top: var(--padding-l);
    color: var(--error-color);
  }

  .preview_no-results :global(:any-link) {
    color: var(--error-color);

    &:hover {
      text-decoration: none;
    }
  }
</style>
