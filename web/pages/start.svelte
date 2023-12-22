<script lang="ts">
  import { generateCredentials } from '@slowreader/core'
  import { startMessages as t } from '@slowreader/core/messages'

  import UiButton from '../ui/button.svelte'
  import UiCardActions from '../ui/card-actions.svelte'
  import UiCard from '../ui/card.svelte'
  import UiPageTitle from '../ui/page-title.svelte'
  import UiPage from '../ui/page.svelte'
  import UiParagraph from '../ui/paragraph.svelte'
</script>

<UiPage title={$t.pageTitle} type="center">
  <UiPageTitle>{$t.title}</UiPageTitle>
  <div class="start">
    <UiCard>
      <UiParagraph>{$t.localDescription1}</UiParagraph>
      <UiParagraph>{$t.localDescription2}</UiParagraph>
      <UiCardActions>
        <UiButton wide on:click={generateCredentials}>
          {$t.localButton}
        </UiButton>
      </UiCardActions>
    </UiCard>
  </div>
</UiPage>

<style>
  .start {
    max-width: 240px;
  }
</style>
