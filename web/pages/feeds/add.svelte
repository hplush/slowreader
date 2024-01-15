<script lang="ts">
  import { mdiPlusCircleOutline } from '@mdi/js'
  import {
    addPreviewCandidate,
    clearPreview,
    onPreviewUrlType,
    previewCandidate,
    previewCandidateAdded,
    previewCandidates,
    previewCandidatesLoading,
    previewNoResults,
    previewPosts,
    previewUrl,
    previewUrlError,
    router,
    setPreviewCandidate,
    setPreviewUrl
  } from '@slowreader/core'
  import { previewMessages as t } from '@slowreader/core/messages'
  import { onDestroy } from 'svelte'

  import { jumpInto } from '../../lib/hotkeys.js'
  import { openURL } from '../../stores/router.js'
  import Button from '../../ui/button.svelte'
  import CardLink from '../../ui/card-link.svelte'
  import CardLinks from '../../ui/card-links.svelte'
  import Card from '../../ui/card.svelte'
  import Loader from '../../ui/loader.svelte'
  import RichTranslation from '../../ui/rich-translation.svelte'
  import TextField from '../../ui/text-field.svelte'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import FeedsEdit from './edit.svelte'
  import FeedsPosts from './posts.svelte'

  export let url: string

  let links: HTMLUListElement
  let feed: HTMLDivElement

  previewUrl.listen(link => {
    let page = router.get()
    if (page.route === 'add' && page.params.url !== link) {
      openURL('add', { url: link })
    }
  })

  $: if (url !== previewUrl.get()) {
    setPreviewUrl(url)
  }

  onDestroy(() => {
    clearPreview()
  })
</script>

<TwoStepsPage title={$t.title}>
  <div slot="one">
    <Card>
      <TextField
        enterHint={$previewCandidates.length > 0}
        error={$previewUrlError ? $t[$previewUrlError] : undefined}
        errorId={$previewNoResults ? 'feeds-add-no-results' : undefined}
        label={$t.urlLabel}
        placeholder="https://mastodon.social/@hplushlab"
        spellcheck={false}
        value={url}
        on:input={e => {
          onPreviewUrlType(e.detail.value)
        }}
        on:enter={e => {
          setPreviewUrl(e.detail.value)
          if ($previewCandidates.length > 0) {
            jumpInto(links)
          }
        }}
      />

      {#if $previewCandidates.length > 0}
        <CardLinks
          bind:node={links}
          on:enter={() => {
            jumpInto(feed)
          }}
        >
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
        <Loader zoneId="add_query" />
      {/if}

      {#if $previewNoResults}
        <div id="feeds-add-no-results" class="feeds-add_no-results">
          <RichTranslation
            text={$t.noResults}
            url="https://github.com/hplush/slowreader/issues"
          />
        </div>
      {/if}
    </Card>

    {#if url === ''}
      <div class="feeds-add_guide">
        <RichTranslation text={$t.searchGuide} />
      </div>
    {/if}
  </div>
  <div bind:this={feed} id="add_feed" slot="two">
    {#if $previewCandidate}
      {#if $previewCandidateAdded === undefined}
        <Loader zoneId="add_feed" />
        {#if $previewPosts}
          <FeedsPosts posts={$previewPosts} />
        {/if}
      {:else if $previewCandidateAdded === false}
        <Button icon={mdiPlusCircleOutline} wide on:click={addPreviewCandidate}>
          {$t.add}
        </Button>
        {#if $previewPosts}
          <FeedsPosts posts={$previewPosts} />
        {/if}
      {:else}
        <FeedsEdit feedId={$previewCandidateAdded} posts={$previewPosts} />
      {/if}
    {/if}
  </div>
</TwoStepsPage>

<style>
  .feeds-add_guide {
    max-width: 450px;
    padding-top: 100px;
    margin: 0 auto;
  }

  .feeds-add_no-results {
    margin-top: var(--padding-m);
    color: var(--error-color);
  }

  .feeds-add_no-results :global(:any-link) {
    color: var(--error-color);

    &:hover {
      text-decoration: none;
    }
  }
</style>
