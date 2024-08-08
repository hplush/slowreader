<script lang="ts">
  import { mdiPlusCircleOutline } from '@mdi/js'
  import {
    addPreviewCandidate,
    onPreviewUrlType,
    previewCandidate,
    previewCandidateAdded,
    previewCandidates,
    previewCandidatesLoading,
    previewNoResults,
    previewPosts,
    previewUrl,
    previewUrlError,
    previewMessages as t
  } from '@slowreader/core'

  import { getURL } from '../../stores/router.ts'
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
</script>

<TwoStepsPage title={$t.title}>
  <div slot="one">
    <Card>
      <TextField
        controls="feeds-add_links"
        error={$previewUrlError ? $t[$previewUrlError] : undefined}
        errorId={$previewNoResults ? 'feeds-add-no-results' : undefined}
        label={$t.urlLabel}
        placeholder="https://mastodon.social/@hplushlab"
        spellcheck={false}
        value={$previewUrl}
        on:input={e => {
          onPreviewUrlType(e.detail.value)
        }}
      />

      {#if $previewCandidates.length > 0}
        <CardLinks id="feeds-add_links">
          {#each $previewCandidates as candidate (candidate.url)}
            <CardLink
              name={candidate.title}
              controls="feeds-add_feed"
              current={$previewCandidate === candidate.url}
              href={getURL({
                params: {
                  candidate: candidate.url,
                  url: $previewUrl
                },
                route: 'add'
              })}
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

    {#if $previewUrl === ''}
      <div class="feeds-add_guide">
        <RichTranslation text={$t.searchGuide} />
      </div>
    {/if}
  </div>
  <div id="feeds-add_feed" slot="two">
    {#if $previewCandidate}
      {#if $previewCandidateAdded === undefined}
        <Loader zoneId="feeds-add_feed" />
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
