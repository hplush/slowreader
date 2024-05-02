<script lang="ts">
  import {
    commonMessages as common,
    exportMessages,
    getCategories,
    getFeeds,
    organizeMessages as t
  } from '@slowreader/core'

  import CardLink from '../../ui/card-link.svelte'
  import CardLinks from '../../ui/card-links.svelte'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'

  export let formatId: string | undefined
  const formats = [
    {
      id: 'opml',
      title: 'OPML'
    },
    {
      id: 'internal',
      title: 'Internal'
    }
  ]

  let categories = getCategories()
  let allFeeds = getFeeds()
</script>

<TwoStepsPage title={$t.byCategoryTitle}>
  <div slot="one">
    <h2 class="feeds-categories_title">{$exportMessages.exportTitle}</h2>

    <CardLinks>
      {#each formats as format (format.id)}
        <CardLink name={format.title} current={format.id === formatId}
        ></CardLink>
      {/each}
    </CardLinks>
  </div>
  <div id="feeds-categories_edit" slot="two"></div>
</TwoStepsPage>
