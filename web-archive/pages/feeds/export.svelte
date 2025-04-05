<script lang="ts">
  import { exportMessages as t } from '@slowreader/core'

  import { getURL } from '../../stores/router.ts'
  import CardLink from '../../ui/card-link.svelte'
  import CardLinks from '../../ui/card-links.svelte'
  import TwoStepsPage from '../../ui/two-steps-page.svelte'
  import ExportInternal from './internal.svelte'
  import ExportOPML from './opml.svelte'

  let { formatId }: { formatId?: string } = $props()

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
  {#snippet one()}
    <h2>{$t.exportTitle}</h2>

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
  {/snippet}
  {#snippet two()}
    <div id="feeds-categories_edit">
      {#if formatId === 'opml'}
        <ExportOPML />
      {/if}
      {#if formatId === 'internal'}
        <ExportInternal />
      {/if}
    </div>
  {/snippet}
</TwoStepsPage>
