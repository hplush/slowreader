<script lang="ts">
  import { mdiArrowRight } from '@mdi/js'
  import { type PaginationValue, feedsMessages as t } from '@slowreader/core'

  import Button from './button.svelte'
  import Clickable from './clickable.svelte'

  let { pages }: { pages: PaginationValue } = $props()

  let step = $derived(100 / pages.count)
</script>

{#if pages.show}
  <div class="pagination" class:is-last={!pages.hasNext}>
    <div class="pagination_pages" class:is-last={!pages.hasNext}>
      <div class="pagination_gutter"></div>
      <div
        style:--pagination-width={`${step}%`}
        style:--pagination-position={`${step * pages.page}%`}
        class="pagination_slider"
      ></div>
      {#each pages.pages as page (page)}
        <Clickable
          class="pagination_page"
          disabled={page === pages.page}
          href={`?from=${page}`}
          title={`${page}`}
        >
          {#if pages.count < 16}
            {page + 1}
          {/if}
        </Clickable>
      {/each}
    </div>
    <div class="pagination_button" aria-hidden={!pages.hasNext}>
      <Button
        disabled={!pages.hasNext}
        href={`?from=${pages.page + 1}`}
        icon={mdiArrowRight}
        variant="attention"
      >
        {$t.nextPage}
      </Button>
    </div>
  </div>
{/if}

<style lang="postcss">
  :global {
    .pagination {
      display: flex;
      gap: 0.25rem;
      width: stretch;
    }

    .pagination_pages {
      position: relative;
      display: grid;
      flex-grow: 1;
      grid-auto-columns: 1fr;
      grid-auto-flow: column;
      height: var(--control-height);
    }

    .pagination_gutter {
      position: absolute;
      inset: 0;
      z-index: 1;
      background: --tune-background(--gutter);
      border-radius: var(--base-radius);
      box-shadow: var(--field-shadow);
    }

    .pagination_slider {
      position: absolute;
      inset-block: 0;
      inset-inline-start: var(--pagination-position);
      z-index: 1;
      width: var(--pagination-width);
      background: --tune-background(--current);
      border-radius: var(--base-radius);
      box-shadow: var(--button-shadow);

      .pagination.is-last & {
        inset-inline: auto 0;
      }
    }

    .pagination_page {
      @mixin clickable;

      z-index: 2;
      flex-grow: 1;
      font: var(--tertiary-font);
      line-height: var(--control-height);
      color: var(--secondary-text-color);
      text-align: center;
      border-radius: var(--base-radius);

      &[aria-disabled='true'] {
        color: var(--text-color);
      }

      &:hover:not(:has(:checked)),
      &:active:not(:has(:checked)),
      &:focus-visible:not(:has(:checked)) {
        background: var(--slider-hover-background);
      }
    }

    .pagination_button {
      .pagination.is-last & {
        opacity: 0%;
      }
    }
  }
</style>
