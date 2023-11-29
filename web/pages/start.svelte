<script lang="ts">
  import { generateCredentials } from '@slowreader/core'
  import { startMessages as t } from '@slowreader/core/messages'

  import UiButton from '../ui/button.svelte'
  import UiCardActions from '../ui/card-actions.svelte'
  import UiCard from '../ui/card.svelte'
  import UiPageTitle from '../ui/page-title.svelte'
  import UiParagraph from '../ui/paragraph.svelte'
</script>

<main class="start">
  <UiPageTitle page={$t.pageTitle} title={$t.title} />
  <div class="start_options">
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
</main>

<style>
  .start {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    margin: 0 auto;
  }

  .start_options {
    max-width: 280px;
  }
</style>
