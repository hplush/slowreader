<script lang="ts">
  import { commonMessages as t } from '@slowreader/core'
  import { createEventDispatcher } from 'svelte'

  import Button from './button.svelte'
  import Paragraph from './paragraph.svelte'

  export let currentPage: number
  export let label: string
  export let totalPages: number

  $: pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  let dispatch = createEventDispatcher()

  function onPageChange(page: number): void {
    dispatch('click', page)
  }
</script>

{#if totalPages > 1}
  <div class="pagination-bar">
    <div class="pagination-bar_progress">
      {#each pages as page (page)}
        <a
          class="pagination-bar_segment"
          class:is-past={page <= currentPage}
          href={`?page=${page}`}
          on:click={() => {
            onPageChange(page)
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
    secondary
    on:click={() => {
      onPageChange(currentPage + 1)
    }}
  >
    {$t.showNextPage}
  </Button>
{/if}

<style>
  .pagination-bar {
    display: flex;
    gap: var(--padding-l);
    width: 100%;
    padding: var(--padding-l) 0;
  }

  .pagination-bar_progress {
    display: flex;
    flex: 1;
    overflow-x: auto;
    border-radius: var(--radius);
  }

  .pagination-bar_segment {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex: 1;
    min-width: 10px;
    font: var(--control-font);
    color: var(--text-color);
    text-decoration: none;
    cursor: pointer;
    user-select: none;
    background: var(--card-color);
    border: none;
    border-inline-end: 1px solid var(--land-color);

    &:first-child {
      border-start-start-radius: 50%;
      border-end-start-radius: 50%;
    }

    &:last-child {
      border-inline-end: none;
      border-start-end-radius: 50%;
      border-end-end-radius: 50%;
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
</style>
