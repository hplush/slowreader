<script lang="ts">
  import { mdiBug, mdiEye, mdiShieldSearch } from '@mdi/js'
  import {
    type AboutPage,
    settingsMessages,
    aboutMessages as t
  } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import Note from '../ui/note.svelte'
  import Output from '../ui/output.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'

  let { page }: { page: AboutPage } = $props()
</script>

<ThinPage title={[$t.pageTitle, $settingsMessages.commonTitle]}>
  <Stack gap="xl">
    <Title>Slow Reader</Title>
    <Output label={$t.version} value={page.appVersion} />
    <Note icon={mdiShieldSearch} variant="good">
      <Stack>
        {$t.opensource}
        <Button
          href="https://github.com/hplush/slowreader"
          icon={mdiEye}
          size="wide"
          target="_blank"
          variant="secondary"
        >
          {$t.viewSources}
        </Button>
      </Stack>
    </Note>
    <Button
      href="https://github.com/hplush/slowreader/issues/new"
      icon={mdiBug}
      size="wide"
      target="_blank"
      variant="secondary"
    >
      {$t.reportIssue}
    </Button>
  </Stack>
</ThinPage>
