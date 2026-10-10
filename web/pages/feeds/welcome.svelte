<script lang="ts">
  import { mdiFireplace, mdiFood, mdiFormatListChecks } from '@mdi/js'
  import { welcomeMessages as t, type WelcomeReader } from '@slowreader/core'

  import { getURL } from '../../stores/url-router.ts'
  import Button from '../../ui/button.svelte'
  import PageIcon from '../../ui/page-icon.svelte'
  import RichText from '../../ui/rich-text.svelte'
  import Stack from '../../ui/stack.svelte'

  let { reader }: { reader: WelcomeReader } = $props()
</script>

<PageIcon
  align="start"
  path={reader.reading === 'fast' ? mdiFood : mdiFireplace}
>
  <Stack gap="l">
    <RichText text={reader.reading === 'fast' ? $t.fastDesc : $t.slowDesc} />
    <Button href={getURL('welcome')} icon={mdiFormatListChecks}>
      {$t.openWelcome}
    </Button>
  </Stack>
</PageIcon>
