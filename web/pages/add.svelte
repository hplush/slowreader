<script lang="ts">
  import { mdiRss } from '@mdi/js'
  import { type AddPage, addMessages as t } from '@slowreader/core'

  import Error from '../ui/error.svelte'
  import Feeds from '../ui/feeds.svelte'
  import Input from '../ui/input.svelte'
  import Loader from '../ui/loader.svelte'
  import Placeholder from '../ui/placeholder.svelte'
  import PopupablePage from '../ui/popupable-page.svelte'
  import RichText from '../ui/rich-text.svelte'
  import Stack from '../ui/stack.svelte'

  let { page }: { page: AddPage } = $props()
  let { candidates, error, noResults, opened, searching } = page
  let { url } = page.params

  let empty = $derived(!$noResults && !$searching && $url === '')

  let gap = $derived.by(() => {
    if (empty) {
      return 'xxxl' as const
    } else if ($searching || $error || $noResults) {
      return 'xl' as const
    } else {
      return 'm' as const
    }
  })
</script>

<PopupablePage title={$t.title}>
  <Stack center {gap}>
    <Input
      aria-controls="add-results"
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
      <Feeds id="add-results" current={$opened} list={$candidates} />
    {/if}
  </Stack>
</PopupablePage>
