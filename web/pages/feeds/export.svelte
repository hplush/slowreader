<script lang="ts">
  import {
    commonMessages as common,
    exportMessages,
    getCategories,
    getFeeds,
    exportMessages as t
  } from '@slowreader/core'
  import { getURL } from '../../stores/router.js'

  import CardLink from '../../ui/card-link.svelte'
  import CardLinks from '../../ui/card-links.svelte'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import ExportOPML from './exportOPML.svelte'

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
</script>

<TwoStepsPage title={$t.exportTitle}>
  <div slot="one">
    <h2 class="feeds-export_title">{$t.exportTitle}</h2>

    <CardLinks>
      {#each formats as format (format.id)}
        <CardLink
          name={format.title}
          current={format.id === formatId}
          href={getURL({
            params: { format: format.id },
            route: 'export'
          })}
        ></CardLink>
      {/each}
    </CardLinks>
  </div>
  <div id="feeds-categories_edit" slot="two">
    {#if formatId === 'opml'}
      <ExportOPML />
    {/if}
  </div>
</TwoStepsPage>

<style>
  .feeds-export_title {
    flex-grow: 1;
    padding-inline-start: var(--padding-l);
    padding-bottom: var(--padding-l);
    font: var(--page-title-font);
  }
</style>
