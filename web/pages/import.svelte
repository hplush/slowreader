<script lang="ts">
  import {
    mdiBriefcaseUploadOutline,
    mdiCheckCircleOutline,
    mdiUpload
  } from '@mdi/js'
  import {
    type ImportPage,
    organizeMessages,
    importMessages as t
  } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import ErrorList from '../ui/error-list.svelte'
  import Error from '../ui/error.svelte'
  import File from '../ui/file.svelte'
  import Loader from '../ui/loader.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import RichText from '../ui/rich-text.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: ImportPage } = $props()
  let { done, feedErrors, fileError, importFile, importing } = page
</script>

<ThinPage title={[$t.title, $organizeMessages.feedsTitle]}>
  <Stack align="center" gap="xxl">
    {#if typeof $done === 'number'}
      <PageIcon path={mdiCheckCircleOutline}>
        <Stack align="center" gap="l">
          <Title>
            {$t.feedsAdded($done)}
          </Title>
          <Button href={getURL('feedsByCategories')} size="wide">
            {$t.goToFeeds}
          </Button>
        </Stack>
      </PageIcon>
    {:else}
      <PageIcon path={mdiBriefcaseUploadOutline}>
        <Stack gap="l">
          {#if $importing}
            <Loader size="wide" value={$importing} />
          {:else}
            <RichText text={$t.description} url={getURL('export')} />
            <File
              accept=".opml,.json,.xml"
              icon={mdiUpload}
              onchange={e => {
                let file = e.currentTarget.files?.[0]
                if (file) importFile(file)
                e.currentTarget.value = ''
              }}
              size="wide"
              variant="main"
            >
              {$t.submit}
            </File>
          {/if}

          {#if $fileError}
            <Error>
              {$t[`${$fileError}Error`]}
            </Error>
          {/if}
        </Stack>
      </PageIcon>
    {/if}

    {#if $feedErrors.length > 0}
      <Stack gap="m">
        <Title>{$t.loadError}</Title>
        <ErrorList
          list={$feedErrors.map(([url, error]) => ({
            errorText: $t[`${error}Error`],
            title: url,
            url
          }))}
        />
      </Stack>
    {/if}
  </Stack>
</ThinPage>
