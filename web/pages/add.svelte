<script lang="ts">
  import { mdiRss } from '@mdi/js'
  import { type AddPage, router, addMessages as t } from '@slowreader/core'

  import { getPopupHash } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import Error from '../ui/error.svelte'
  import Input from '../ui/input.svelte'
  import Loader from '../ui/loader.svelte'
  import Placeholder from '../ui/placeholder.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import RichText from '../ui/rich-text.svelte'
  import Stack from '../ui/stack.svelte'

  let { page }: { page: AddPage } = $props()
  let { candidates, error, noResults, searching } = page
  let { url } = page.params

  let empty = $derived(!$noResults && !$searching && $url === '')

  let gap = $derived.by(() => {
    if (!$noResults && !$searching && $url === '') {
      return 'xxxl' as const
    } else {
      return 'xl' as const
    }
  })
</script>

<PopupablePage title={$t.title}>
  <Stack center {gap}>
    <Input
      errorId={$error || $noResults ? 'add-error' : undefined}
      label={$t.urlLabel}
      labelless
      oninput={value => {
        page.inputUrl(value)
      }}
      placeholder={$t.urlLabel}
      value={$url}
    />
    {#if empty}
      <Placeholder icon={mdiRss}>
        <RichText text={$t.searchGuide} />
      </Placeholder>
    {:else if $searching}
      <Loader />
    {:else if $error}
      <Error id="add-error">{$t[$error]}</Error>
    {:else if $noResults}
      <Error id="add-error">
        <RichText
          text={$t.noResults}
          url="https://github.com/hplush/slowreader/issues"
        />
      </Error>
    {:else}
      <Stack gap="s">
        {#each $candidates as candidate (candidate.url)}
          <Button
            href={getPopupHash($router, 'feedUrl', candidate.url)}
            size="wide"
          >
            {candidate.name}
            {candidate.title}
          </Button>
        {/each}
      </Stack>
    {/if}
  </Stack>
</PopupablePage>
