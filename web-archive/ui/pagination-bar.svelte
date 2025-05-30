<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'

  import Button from './button.svelte'
  import Paragraph from './paragraph.svelte'

  let {
    currentPage,
    label,
    onclick,
    totalPages
  }: {
    currentPage: number
    label: string
    onclick?: (page: number) => void
    totalPages: number
  } = $props()

  let pages = $derived(Array.from({ length: totalPages }, (_, i) => i + 1))
</script>

{#if totalPages > 1}
  <div class="pagination-bar">
    <div class="pagination-bar_progress">
      {#each pages as page (page)}
        <a
          class="pagination-bar_segment"
          class:is-past={page <= currentPage}
          aria-label={`${page}`}
          href={`?page=${page}`}
          onclick={() => {
            if (onclick) onclick(page)
          }}
        >
        </a>
      {/each}
    </div>
    <Paragraph>{label}</Paragraph>
  </div>
{/if}
{#if currentPage < totalPages}
  <Button
    href={`?page=${currentPage + 1}`}
    onclick={() => {
      if (onclick) onclick(currentPage + 1)
    }}
  >
    {$t.showNextPage}
  </Button>
{/if}

<style>
  :global {
    .pagination-bar {
      display: flex;
      gap: var(--padding-m);
      width: 100%;
      padding-bottom: var(--padding-m);
    }

    .pagination-bar_progress {
      display: flex;
      flex: 1;
      align-items: center;
      overflow-x: auto;
      border-radius: var(--radius);
    }

    .pagination-bar_segment {
      position: relative;
      display: block;
      flex: 1;
      height: 12px;
      color: var(--text-color);
      text-decoration: none;
      cursor: pointer;
      user-select: none;
      background: var(--card-color);
      border: none;
      border-inline-end: 1px solid var(--land-color);

      &:first-child {
        border-start-start-radius: 6px;
        border-end-start-radius: 6px;
      }

      &:last-child {
        border-inline-end: none;
        border-start-end-radius: 6px;
        border-end-end-radius: 6px;
      }

      &:hover,
      &:focus-visible {
        background-color: var(--hover-color);
      }

      &:active {
        background-color: var(--land-color);
        opacity: 100%;
      }

      &.is-past {
        background-color: var(--accent-color);
        border-inline-end: 1px solid var(--accent-color);
      }
    }
  }
</style>
