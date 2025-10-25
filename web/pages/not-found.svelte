<script lang="ts">
  import { mdiArrowLeft, mdiBookOpenPageVariant, mdiFire } from '@mdi/js'
  import { notFoundMessages as t, userId } from '@slowreader/core'

  import { getURL } from '../stores/url-router.ts'
  import Button from '../ui/button.svelte'
  import PageAction from '../ui/page-action.svelte'
  import PageIcon from '../ui/page-icon.svelte'
  import Stack from '../ui/stack.svelte'
  import ThinPage from '../ui/thin-page.svelte'
  import Title from '../ui/title.svelte'
</script>

<ThinPage bottomOnMobile={false} center title={$t.pageTitle}>
  {#if !$userId}
    <PageAction>
      <Button href={getURL('home')} icon={mdiArrowLeft} variant="secondary">
        {$t.home}
      </Button>
    </PageAction>
  {/if}
  <Stack align="center" gap="xl">
    <PageIcon extra={mdiFire} path={mdiBookOpenPageVariant} />
    <Title>{$t.pageText}</Title>
  </Stack>
</ThinPage>
