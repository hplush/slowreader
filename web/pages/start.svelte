<script lang="ts">
  import { generateCredentials, startMessages as t } from '@slowreader/core'

  import Button from '../ui/button.svelte'
  import CardActions from '../ui/card-actions.svelte'
  import Card from '../ui/card.svelte'
  import PageTitle from '../ui/page-title.svelte'
  import Page from '../ui/page.svelte'
  import Paragraph from '../ui/paragraph.svelte'
</script>

<Page title={$t.pageTitle} type="center">
  <PageTitle>{$t.title}</PageTitle>
  <div class="start">
    <Card>
      <Paragraph>{$t.localDescription1}</Paragraph>
      <Paragraph>{$t.localDescription2}</Paragraph>
      <CardActions>
        <Button wide on:click={generateCredentials}>
          {$t.localButton}
        </Button>
      </CardActions>
    </Card>
  </div>
</Page>

<style>
  .start {
    max-width: 240px;
  }
</style>
