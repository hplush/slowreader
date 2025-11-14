<script lang="ts">
  import { mdiFireplace, mdiFood } from '@mdi/js'
  import {
    feedsMessages,
    welcomeMessages as t,
    type WelcomeReader
  } from '@slowreader/core'

  import PageIcon from '../../ui/page-icon.svelte'
  import PopupablePage from '../../ui/popupable-page.svelte'
  import RichText from '../../ui/rich-text.svelte'

  let { reader }: { reader: WelcomeReader } = $props()
</script>

{#if reader.reading === 'fast'}
  <PopupablePage title={$feedsMessages.fastTitle}>
    <PageIcon path={mdiFood}>
      <RichText text={$t.fastDesc} />
    </PageIcon>
  </PopupablePage>
{:else}
  <PopupablePage title={$feedsMessages.slowTitle}>
    <PageIcon path={mdiFireplace}>
      <RichText text={$t.slowDesc} />
    </PageIcon>
  </PopupablePage>
{/if}
